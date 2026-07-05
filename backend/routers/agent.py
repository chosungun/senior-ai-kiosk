from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from database import get_db
from models.models import Menu, FAQ, StoreInfo
import httpx, os, json, re, asyncio

router = APIRouter()

class AgentRequest(BaseModel):
    text:  str
    state: dict  # { cart: [...], total: 0 }

class AgentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    class_:   str = Field(alias="class")
    response: str
    action:   str = "none"
    items:    list = []
    menus:    list = []
    screen:   str | None = None

SYSTEM_PROMPT = """
너는 카페 키오스크 음성 AI야. 손님 질문은 항상 아래 4가지 유형 중 하나로 분류돼:

1. FAQ - 매장 정보 질문 (화장실, 와이파이, 쿠폰, 알레르기, 할인 등) → 등록된 FAQ 데이터에서 답변
2. ORDER - 주문/옵션 (메뉴, 수량, 추가/제외) → 확인 질문 후 장바구니 반영
3. RECOMMEND - 메뉴 추천 (날씨/계절/인기 기반) → 1~3개 추천 + 짧은 이유
4. UI_CONTROL - 화면 전환 (고대비, 화면확대, 결제화면 등) → 즉시 전환 후 완료 안내

규칙:
- 답변은 반드시 아래 JSON 형식으로만 출력해. JSON 외 다른 텍스트는 절대 포함하지 마.
- 메뉴/가격은 등록된 데이터만 사용, 임의로 지어내지 마.
- 모호하면 짧게 되묻는 질문을 반환해.

출력 형식:
{
  "class": "FAQ | ORDER | RECOMMEND | UI_CONTROL",
  "response": "손님에게 보여줄 답변 텍스트",
  "action": "실행할 동작 (아래 [class별 항목] 참고)",
  "items": [],
  "menus": [],
  "screen": null
}
- items/menus/screen은 해당 class에서 쓰는 필드만 채우고 나머지는 빈 배열([])이나 null로 둬.

[class별 action/항목 형식]

class=FAQ
- action: "none"

class=RECOMMEND
- action: "show_recommendations"
- menus: ["메뉴1", "메뉴2"]  (후보 2~3개)

class=ORDER
- 옵션(온도 등) 미선택 시 (예: "아메리카노 하나"):
  - action: "ask_options"
  - items: [{"menu":"메뉴명","qty":1,"options":[{"name":"옵션명","value":"선택값"}]}]
  - 미선택 옵션은 options 배열에서 생략. response로 "따뜻한 걸로 드릴까요, 시원한 걸로 드릴까요?"처럼 되물어.
- 메뉴·옵션이 모두 확정된 경우 (예: "아이스 아메리카노 줘"):
  - action: "confirm_add"
  - items: [{"menu":"메뉴명","qty":1,"options":[{"name":"옵션명","value":"선택값(예: ICE, HOT, 제외, 추가)"}]}]
  - response로 "장바구니에 담을까요?"라고 확인.
  - 부정 표현("아이스크림 넣지마","샷 빼")은 {"name":"아이스크림","value":"제외"} 형태로 반드시 명시.
- 장바구니 규칙: state의 cart는 이미 담긴 것. items에는 이번 발화에서 새로 요청한 것만 담기. "~도","~추가" 표현은 기존 장바구니에 추가하는 것.

class=UI_CONTROL
- action: "switch_screen"
- screen: "payment | home | call_staff | close_overlay"
  - payment: "결제할게요" 등 → 결제 화면 이동
  - home: "처음으로 돌아갈래" 등 → 홈 화면 이동
  - call_staff: "직원 불러줘" 등 → 직원 호출
  - close_overlay: "대화 그만할래", "닫아줘" 등 → 대화창 닫기
  - response는 행동을 안내하는 한 문장으로.

[한국어 주문 파싱 규칙]
- "아이스 [메뉴]" → {"name":"온도","value":"ICE"}
- "핫/따뜻한 [메뉴]" → {"name":"온도","value":"HOT"}
- "크게/라지/큰 거" → {"name":"사이즈","value":"크게"}
- "보통/기본/작게/중간" → {"name":"사이즈","value":"보통"}
- 온도·사이즈 수식어는 옵션이지 별도 메뉴가 아님.
- 컨텍스트에 없는 메뉴명은 response에 안내하고 data.items에서 제외.
"""

GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")


def build_context(db: Session) -> str:
    menus = db.query(Menu).filter(Menu.is_active == True).all()
    faqs  = db.query(FAQ).filter(FAQ.is_active == True).all()
    store = db.query(StoreInfo).first()

    def _fmt_opts(opts):
        if not opts: return ''
        parts = [f"{o['name']}({'·'.join(c['label'] for c in o.get('choices', []))})" for o in opts]
        return f" [{', '.join(parts)}]"

    menu_list = "\n".join([
        f"- {m.name} ({m.price}원){' [품절]' if m.is_sold_out else ''}{_fmt_opts(m.options or [])}"
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
            "max_tokens": 600,
            "temperature": 0.1,
        },
    )
    res.raise_for_status()
    raw = res.json()["choices"][0]["message"]["content"]
    content = (raw or "").strip()

    if not content:
        raise json.JSONDecodeError("빈 응답", "", 0)

    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    match = re.search(r'\{.*\}', content, re.DOTALL)
    if match:
        return json.loads(match.group())

    raise json.JSONDecodeError("JSON을 찾을 수 없음", content, 0)


async def call_groq(user_text: str, context: str, state: dict) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY가 설정되지 않았습니다")

    prompt = (
        f"[장바구니]{json.dumps(state.get('cart', []), ensure_ascii=False)}\n"
        f"[총액]{state.get('total', 0)}원\n"
        f"[컨텍스트]{context}\n"
        f"[발화]{user_text}"
    )
    history = state.get('history', [])
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-6:]:
        role = "user" if h.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": prompt})
    retry_msg = {"role": "user", "content": "반드시 JSON만 출력해줘. 다른 텍스트 없이 { 로 시작하는 JSON만."}

    async with httpx.AsyncClient(timeout=25.0) as client:
        for attempt in range(5):
            try:
                return await _request_groq(client, api_key, messages)
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < 4:
                    wait = 2 ** (attempt + 1)
                    print(f"[agent] 429 rate limit, {wait}s 후 재시도 ({attempt+1}/4)")
                    await asyncio.sleep(wait)
                    continue
                raise
            except (json.JSONDecodeError, KeyError, IndexError) as e:
                print(f"[agent] 파싱 실패 (attempt {attempt}): {e}")
                if attempt < 3:
                    if retry_msg not in messages:
                        messages = messages + [retry_msg]
                    await asyncio.sleep(1)
                    continue
                raise


def _has_faq_match(user_text: str, faqs) -> bool:
    for faq in faqs:
        keywords = faq.keywords or []
        if any(kw in user_text for kw in keywords):
            return True
        if faq.question:
            words = [w for w in faq.question.split() if len(w) >= 2]
            if any(w in user_text for w in words):
                return True
    return False


@router.post("/chat", response_model=AgentResponse)
async def chat(req: AgentRequest, db: Session = Depends(get_db)):
    faqs    = db.query(FAQ).filter(FAQ.is_active == True).all()
    context = build_context(db)

    try:
        result = await call_groq(req.text, context, req.state)
    except Exception as e:
        print(f"[agent error] {type(e).__name__}: {e}")
        return AgentResponse(**{
            "class":    "FAQ",
            "response": "잘 듣지 못했어요. 다시 한 번 말씀해 주시겠어요?",
            "action":   "none",
        })

    response_text = result.get("response", "잘 듣지 못했어요. 다시 한 번 말씀해 주시겠어요?")
    if result.get("class") == "FAQ" and not _has_faq_match(req.text, faqs):
        response_text = "해당 정보는 카운터에 문의해 주세요."

    return AgentResponse(**{
        "class":    result.get("class", "FAQ"),
        "response": response_text,
        "action":   result.get("action", "none"),
        "items":    result.get("items") or [],
        "menus":    result.get("menus") or [],
        "screen":   result.get("screen"),
    })
