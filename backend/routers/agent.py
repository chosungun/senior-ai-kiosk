from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.models import Menu, FAQ, StoreInfo
import httpx, os, json

router = APIRouter()

class AgentRequest(BaseModel):
    text:  str
    state: dict

class AgentResponse(BaseModel):
    intent:    str
    state:     dict
    reply:     str
    ui_action: str

SYSTEM_PROMPT = """
너는 카페 키오스크 AI 어시스턴트야. 고령층도 쉽게 쓸 수 있도록 친절하고 간결하게 답해.
반드시 아래 JSON 형식으로만 응답해:
{"intent": "...", "items": [], "reply": "...", "ui_action": "..."}

규칙:
- 주문 의도면 intent=order, items에 파싱한 메뉴를 담아줘. 옵션이 없는 메뉴는 options를 빈 배열로 둬.
- FAQ/매장정보 질문이면 intent=faq, reply에 답변, ui_action=stay
- 불만/항의면 intent=complaint, ui_action=call_staff
- 알 수 없으면 intent=unclear, ui_action=fallback
- reply는 반드시 한국어, 2문장 이내
- 모호한 표현("달달한 거", "시원한 거")은 메뉴와 연결해서 확인 질문으로 reply를 만들어
- 메뉴 DB에 없는 메뉴는 reply에 "죄송해요, 해당 메뉴는 없어요"라고 답해
"""

# llama-3.3-70b-versatile은 json_schema를 지원하지 않으므로 json_object를 사용한다.
# 형식이 깨질 경우를 대비해 1회 재시도를 둔다.
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

RESPONSE_FORMAT = {"type": "json_object"}


def build_context(db: Session) -> str:
    menus = db.query(Menu).filter(Menu.is_active == True).all()
    faqs  = db.query(FAQ).filter(FAQ.is_active == True).all()
    store = db.query(StoreInfo).first()

    menu_list = "\n".join([
        f"- {m.name} ({m.price}원){' [품절]' if m.is_sold_out else ''}"
        for m in menus
    ])
    faq_list  = "\n".join([f"Q: {f.question}\nA: {f.answer}" for f in faqs])
    store_txt = ""
    if store:
        store_txt = f"매장명: {store.name}, 영업시간: {store.open_time}~{store.close_time}, 공지: {store.notice or '없음'}"

    return f"[메뉴]\n{menu_list}\n\n[FAQ]\n{faq_list}\n\n[매장정보]\n{store_txt}"


async def _request_groq(client: httpx.AsyncClient, api_key: str, messages: list) -> dict:
    res = await client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "messages": messages,
            "max_tokens": 512,
            "temperature": 0.1,
            "response_format": RESPONSE_FORMAT,
        },
    )
    res.raise_for_status()
    content = res.json()["choices"][0]["message"]["content"].strip()

    # strict:false 모드라 가끔 마크다운 코드펜스가 섞여 나올 수 있어 방어적으로 한 번 더 벗겨낸다.
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    return json.loads(content)


async def call_groq(user_text: str, context: str, state: dict) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY가 설정되지 않았습니다")

    prompt = f"""
[현재 키오스크 상태]
{json.dumps(state, ensure_ascii=False)}

[매장 정보 컨텍스트]
{context}

[사용자 발화]
{user_text}
"""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": prompt},
    ]

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            return await _request_groq(client, api_key, messages)
        except (json.JSONDecodeError, KeyError, IndexError):
            # response_format이 best-effort(strict:false)라 100% 보장은 아니라서,
            # 형식이 깨졌을 때 한 번만 더 시도한다. 그래도 안되면 위 호출부에서 502로 처리.
            retry_messages = messages + [
                {"role": "user", "content": "방금 응답이 JSON 스키마를 벗어났어. 스키마에 맞는 JSON만 다시 출력해줘."}
            ]
            return await _request_groq(client, api_key, retry_messages)


@router.post("/chat", response_model=AgentResponse)
async def chat(req: AgentRequest, db: Session = Depends(get_db)):
    context = build_context(db)

    try:
        result = await call_groq(req.text, context, req.state)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"JSON 파싱 오류: {e}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Groq API 오류: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API 오류: {e}")

    new_state = dict(req.state)
    if result.get("intent") == "order" and result.get("items"):
        new_state["items"] = new_state.get("items", []) + result["items"]
        if result.get("ui_action") == "next_step":
            steps = ["주문시작", "메뉴선택", "옵션선택", "결제확인", "결제진행"]
            cur = steps.index(new_state.get("step", "메뉴선택")) if new_state.get("step") in steps else 0
            new_state["step"] = steps[min(cur + 1, len(steps) - 1)]

    return AgentResponse(
        intent    = result.get("intent", "unclear"),
        state     = new_state,
        reply     = result.get("reply", "다시 한 번 말씀해 주시겠어요?"),
        ui_action = result.get("ui_action", "fallback"),
    )
