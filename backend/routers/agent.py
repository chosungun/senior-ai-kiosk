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

사용자 발화를 분석해서 반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 절대 포함하지 마.

{
  "intent": "order" | "faq" | "complaint" | "unclear",
  "items": [
    {"menu": "메뉴명", "qty": 1, "options": {"온도": "ICE", "사이즈": "보통"}}
  ],
  "reply": "사용자에게 TTS로 읽어줄 짧은 안내 문장",
  "ui_action": "next_step" | "stay" | "call_staff" | "fallback"
}

규칙:
- 주문 의도면 intent=order, items에 파싱한 메뉴 담기
- FAQ/매장정보 질문이면 intent=faq, reply에 답변, ui_action=stay
- 불만/항의면 intent=complaint, ui_action=call_staff
- 알 수 없으면 intent=unclear, ui_action=fallback
- reply는 반드시 한국어, 2문장 이내
- 모호한 표현("달달한 거", "시원한 거")은 메뉴와 연결해서 확인 질문
- 메뉴 DB에 없는 메뉴는 "죄송해요, 해당 메뉴는 없어요"
"""

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
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                "max_tokens": 512,
                "temperature": 0.1,
            },
        )
        res.raise_for_status()
        content = res.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())

@router.post("/chat", response_model=AgentResponse)
async def chat(req: AgentRequest, db: Session = Depends(get_db)):
    context = build_context(db)

    try:
        result = await call_groq(req.text, context, req.state)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"JSON 파싱 오류: {e}")
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
