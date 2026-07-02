from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.models import Menu, FAQ, StoreInfo
import httpx, os, json, re, asyncio

router = APIRouter()

class AgentRequest(BaseModel):
    text:  str
    state: dict  # { cart: [...], total: 0 }

class AgentResponse(BaseModel):
    intent:            str
    ui_action:         str
    reply:             str
    recommended_menus: list = []
    items_to_add:      list = []

SYSTEM_PROMPT = """
너는 카페 키오스크 AI 어시스턴트야. 고령층도 쉽게 쓸 수 있도록 매우 친절하고 간결하게 응답해.
너의 가장 중요한 역할은 사용자의 말을 듣고 프론트엔드 화면을 어떻게 변화시킬지(ui_action) 정확하게 지시하는 거야.

[출력 형식]
반드시 아래 JSON 스키마를 엄격히 준수하여 응답해 (다른 텍스트 없이 JSON만 반환):
{
  "_thinking": "사용자 의도 파악 및 UI 분기(FAQ/주문/화면전환) 논리적 사고 (1-2문장)",
  "intent": "faq | order | system_action | unclear",
  "ui_action": "명령어 (아래 규칙 참고)",
  "reply": "한국어 답변 (2문장 이내, 고령층 맞춤형 친절한 말투)",
  "recommended_menus": ["추천메뉴1", "추천메뉴2"],
  "items_to_add": [
    {
      "menu": "메뉴명",
      "qty": 1,
      "options": [{"name": "옵션명", "value": "선택값(예: ICE, HOT, 제외, 추가)"}]
    }
  ]
}

[상황별 라우팅 및 UI 제어 규칙]

1. FAQ (단순 질문)
- 조건: "화장실 어디야?", "흡연실 있어?", "영업시간 언제까지야?" 등
- intent: faq
- ui_action: show_chat_bubble
- 행동: reply에 짧고 명확하게 답변만 적어. recommended_menus와 items_to_add는 빈 배열로.
- 추가 주문 유도 금지.

2. ORDER (주문) - 단계별 UI 처리

2-A. 모호한 주문 (메뉴 특정 불가): "달달한 거 줘", "시원한 거 추천해 줘"
  - ui_action: show_recommendations
  - recommended_menus 배열에 후보 메뉴 2~3개 담기. items_to_add는 빈 배열.
  - reply로 추천 이유와 함께 제안.

2-B. 필수 옵션 누락: "아메리카노 하나" (온도 선택 안 함)
  - ui_action: ask_options
  - items_to_add에 옵션 없이 메뉴만 담기. recommended_menus는 빈 배열.
  - reply로 "따뜻한 걸로 드릴까요, 시원한 걸로 드릴까요?"라고 물어봐.

2-C. 완벽한 주문 (확인 및 담기): "아이스 아메리카노 줘", "크로플 하나 주는데 아이스크림은 넣지 마"
  - ui_action: show_confirm_modal
  - items_to_add에 파싱된 메뉴와 옵션을 정확히 담기. recommended_menus는 빈 배열.
  - reply로 "장바구니에 담을까요?"라고 확인.
  - 부정 표현 규칙: "아이스크림 넣지마", "샷 빼" 같은 부정문은 options 배열에 {"name": "아이스크림", "value": "제외"} 형태로 반드시 명시.

3. SYSTEM_ACTION (화면 전환 및 시스템 제어)
- 조건: "결제할게요", "처음으로 돌아갈래", "직원 불러줘", "주문 취소할래" 등
- intent: system_action
- ui_action: go_checkout | go_home | call_staff | close_overlay 중 하나 선택
- recommended_menus와 items_to_add는 빈 배열.
- reply는 행동을 안내하는 한 문장으로.

4. 예외 처리
- 모호하거나 알 수 없는 소음: intent=unclear, ui_action=fallback
- reply: "잘 듣지 못했어요. 다시 한 번 말씀해 주시겠어요?"

[한국어 주문 파싱 규칙]
- "아이스 [메뉴]" → options=[{"name":"온도","value":"ICE"}]
- "핫/따뜻한 [메뉴]" → options=[{"name":"온도","value":"HOT"}]
- "크게/라지/큰 거" → options=[{"name":"사이즈","value":"크게"}]
- "보통/기본/작게/중간" → options=[{"name":"사이즈","value":"보통"}]
- 온도·사이즈 수식어는 옵션이지 별도 메뉴가 아님.
- 컨텍스트에 없는 메뉴명은 "없는 메뉴"로 처리 후 reply에 안내.
- 메뉴에 사이즈 옵션이 있고 사용자가 "크게"를 말했으면 반드시 사이즈=크게로 파싱할 것.

[장바구니 규칙]
- 현재 상태의 cart는 이미 담긴 것들. 절대 items_to_add에 포함 금지.
- 사용자가 이번 발화에서 새로 요청한 것만 items_to_add에 담기.
- "~도", "~추가", "~도 하나" 표현은 기존 장바구니에 추가하는 것.
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
        return AgentResponse(
            intent="unclear",
            ui_action="fallback",
            reply="잘 듣지 못했어요. 다시 한 번 말씀해 주시겠어요?",
        )

    reply = result.get("reply", "잘 듣지 못했어요. 다시 한 번 말씀해 주시겠어요?")
    if result.get("intent") == "faq" and not _has_faq_match(req.text, faqs):
        reply = "해당 정보는 카운터에 문의해 주세요."

    return AgentResponse(
        intent            = result.get("intent", "unclear"),
        ui_action         = result.get("ui_action", "fallback"),
        reply             = reply,
        recommended_menus = result.get("recommended_menus") or [],
        items_to_add      = result.get("items_to_add") or [],
    )
