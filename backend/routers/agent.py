from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from database import get_db
from models.models import Menu, FAQ, StoreInfo
import httpx, os, json, re, asyncio

router = APIRouter()

class AgentRequest(BaseModel):
    text:  str
    state: dict  # { cart: [...], total: 0, mode: "faq" | "order" }

class AgentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    class_:   str = Field(alias="class")
    response: str
    action:   str = "none"
    items:    list = []
    menus:    list = []
    screen:   str | None = None

# ── FAQ 전용 트랙 ─────────────────────────────────────────────────────────
SYSTEM_PROMPT_FAQ = """
너는 카페 키오스크의 FAQ 전용 음성 도우미야. 화장실, 와이파이, 쿠폰, 알레르기, 할인, 영업시간 등
매장 이용 관련 질문에 등록된 FAQ 데이터와 [메뉴 정보]를 참고해서 답변해.

규칙:
- 답변은 반드시 아래 JSON 형식으로만 출력해. JSON 외 다른 텍스트는 절대 포함하지 마.
- 특정 메뉴의 알레르기 유발 성분을 물으면 [메뉴 정보]의 해당 메뉴 설명 끝에 있는 "(알레르기 유발 성분: ...)" 문구를 그대로 근거로 답해. "없음"이면 알레르기 유발 성분이 없다고 답해.
- 등록된 FAQ 데이터와 [메뉴 정보]에 없는 내용은 지어내지 말고 모른다고 답해.
- 손님이 주문이나 메뉴 추천을 요청하면, response에서 "그건 음성으로 주문하기 버튼을 이용해 주세요"처럼 안내해.

출력 형식:
{
  "response": "손님에게 보여줄 답변 텍스트"
}
"""

# ── 주문/추천 전용 트랙 ────────────────────────────────────────────────────
SYSTEM_PROMPT_ORDER = """
너는 카페 키오스크의 주문 전용 음성 AI야. 손님 발화는 항상 아래 2가지 유형 중 하나로 분류돼:

1. ORDER - 주문/옵션 (메뉴, 수량, 추가/제외) → 확인 질문 후 장바구니 반영
2. RECOMMEND - 메뉴 추천 (날씨/계절/인기 기반) → 1~3개 추천 + 짧은 이유

규칙:
- 답변은 반드시 아래 JSON 형식으로만 출력해. JSON 외 다른 텍스트는 절대 포함하지 마.
- 메뉴/가격은 등록된 데이터만 사용, 임의로 지어내지 마.
- 모호하면 짧게 되묻는 질문을 반환해.
- 손님이 매장 정보(화장실, 와이파이 등)를 물어보면, class는 직전 맥락에 맞게 ORDER나 RECOMMEND로 유지하고 response에서 "그 부분은 도움이 필요하신가요 버튼에서 확인해 주세요"처럼 안내해.

출력 형식:
{
  "class": "ORDER | RECOMMEND",
  "response": "손님에게 보여줄 답변 텍스트",
  "action": "실행할 동작 (아래 [class별 항목] 참고)",
  "items": [],
  "menus": []
}
- items/menus는 해당 class에서 쓰는 필드만 채우고 나머지는 빈 배열([])로 둬.

[class별 action/항목 형식]

class=RECOMMEND
- action: "show_recommendations"
- menus: ["메뉴1", "메뉴2"]  (후보 2~3개)
- response는 짧게 한 문장으로만: "이런 메뉴는 어떠세요?" 정도. 후보들은 화면에 사진과 이름으로 카드로 표시되니 response에서 메뉴 설명이나 특징을 나열하거나 장황하게 설명하지 마.
- "달달한 거", "안 단 거", "제로 슈가", "무설탕", "당 없는 거", "카페인 없는 거", "디카페인", "새콤한 거", "고소한 거" 처럼 맛/성분 기준으로 애매하게 추천을 요청하면:
  - [메뉴]의 각 메뉴명 뒤 ":" 다음에 붙은 설명 문구를 근거로 조건에 맞는 메뉴만 골라. 설명에 없는 성분·맛은 있다고 지어내지 마.
  - 예: "카페인 없는 거"는 설명에 "카페인이 없는" 등으로 명시된 메뉴만 해당. "달달한 거/단 거"는 설명에 "달콤/달달/달아요/달고" 등 단맛 표현이 있는 메뉴. "안 단 거/덜 단 거"는 "단맛이 거의 없다/적다/쓴맛이 강하다" 표현이 있는 메뉴. "새콤한 거"는 "상큼/새콤" 표현이 있는 메뉴. "고소한 거"는 "고소" 표현이 있는 메뉴.
  - 조건에 정확히 맞는 메뉴가 하나도 없으면(예: 완전 무설탕을 뜻하는 "제로 슈가" 메뉴는 실제로 없음) menus는 빈 배열로 두고, response에서 그런 메뉴는 없다고 솔직히 안내해. 조건에 가장 가까운 대안이 있으면 그 메뉴명을 함께 한 문장으로 언급해도 되고(예: "제로 슈가 메뉴는 없지만 단맛이 거의 없는 아메리카노는 어떠세요?"), 이 경우엔 response 한 문장 분량을 넘겨도 괜찮아.

class=ORDER
- 옵션(온도 등)이나 수량이 발화에 명시되지 않은 경우 (예: "아메리카노 주세요"):
  - action: "ask_options"
  - items: [{"menu":"메뉴명","qty":1,"options":[{"name":"옵션명","value":"선택값"}]}]  (qty는 발화에 수량이 없으면 1로 채우되, 미확정임을 response에서 함께 물어봄)
  - response는 짧게 한 문장으로만: "옵션을 선택해 주세요." 정도. 온도/사이즈 등 선택지는 화면에 버튼으로 이미 표시되니 response에서 일일이 나열하거나 장황하게 설명하지 마.
- 메뉴·옵션·수량이 모두 확정된 경우 (예: "아이스 아메리카노 한 잔 줘"):
  - action: "confirm_add"
  - items: [{"menu":"메뉴명","qty":발화에 명시된 수량,"options":[{"name":"옵션명","value":"선택값(예: ICE, HOT, 제외, 추가)"}]}]
  - response로 "장바구니에 넣으시려면 담기 버튼을 눌러주세요."라고 안내.
  - 부정 표현("아이스크림 넣지마","샷 빼")은 {"name":"아이스크림","value":"제외"} 형태로 반드시 명시.
- 같은 메뉴를 여러 개 주문하면서 옵션(온도 등)이 잔·개별로 다르게 지정되면(예: "아메리카노 두 잔, 하나는 따뜻하게 하나는 시원하게", "아메리카노 두 개 하나는 아이스로 하나는 핫으로"), 절대 하나의 items 항목에 qty만 늘려서 몰아넣지 마. 옵션 조합이 같은 수량끼리 묶어서 items를 각각 별도 항목(qty는 그 조합의 개수)으로 나눠 담아야 해.
  예: "아메리카노 두 잔, 하나는 따뜻하게 하나는 시원하게" →
  items: [{"menu":"아메리카노","qty":1,"options":[{"name":"온도","value":"HOT"}]}, {"menu":"아메리카노","qty":1,"options":[{"name":"온도","value":"ICE"}]}]
- 장바구니 규칙: state의 cart는 이미 담긴 것. items에는 이번 발화에서 새로 요청한 것만 담기. "~도","~추가" 표현은 기존 장바구니에 추가하는 것.
- 한 발화에 서로 다른 메뉴가 여러 개 언급되면("아메리카노 30개 넣고 마카롱 하나 넣어주세요" 등), 절대 일부만 처리하거나 뭉뚱그려 답하지 말고 items 배열에 언급된 메뉴 전부를 각각의 항목으로 담아야 해. 그중 하나라도 옵션·수량이 불명확하면 action은 "ask_options"로, response는 "옵션을 선택해 주세요." 정도로 짧게. 전부 확정됐을 때만 "confirm_add".

[한국어 주문 파싱 규칙]
- 아래 예시는 대표 표현일 뿐이야. 문자 그대로 일치할 때만 적용하지 말고, 같은 의미의 다른 말투(구어체, 조사 변형, "~로요/~로 주세요/~로 할게요" 등)도 같은 값으로 해석해.
- "아이스 [메뉴]", "아이스로요", "차갑게" → {"name":"온도","value":"ICE"}
- "핫/따뜻한 [메뉴]", "뜨거운 걸로요" → {"name":"온도","value":"HOT"}
- "크게/라지/큰 거", "큰 걸로 주세요" → {"name":"사이즈","value":"크게"}
- "보통/기본/작게/중간", "기본으로 주세요"(사이즈를 묻는 맥락일 때) → {"name":"사이즈","value":"보통"}
- 온도·사이즈 수식어는 옵션이지 별도 메뉴가 아님.
- "한 잔/두 잔/세 잔" 또는 "한 개/두 개" 등 수사+단위 표현은 옵션이 아니라 수량 → items[].qty에 숫자로 반영("한/두/세/네/다섯" 등 순우리말 수사도 숫자로 변환).
- 부정/거절 표현("넣지 마세요","빼주세요","안 넣어도 돼요")은 직전에 언급된 옵션(샷, 아이스크림 등)에 대해 {"value":"제외"}로 반영. 어떤 옵션을 가리키는지 발화나 대화 맥락(history)에서 찾아 특정하고, 특정할 수 없으면 response로 되물어.
- "기본으로 주세요"처럼 추가 옵션(샷 등)을 묻는 맥락에서 나오면 "추가하지 않음"(옵션 생략 또는 {"value":"기본"})으로 해석.
- 컨텍스트에 없는 메뉴명은 response에 안내하고 data.items에서 제외.
"""

# .env.example을 그대로 복사하면 GROQ_MODEL_FAQ= 처럼 빈 문자열이 주입되므로,
# getenv 기본값이 아니라 or 체인으로 빈 값까지 걸러내야 모델명이 ""로 넘어가지 않음
GROQ_MODEL_FAQ   = os.getenv("GROQ_MODEL_FAQ")   or os.getenv("GROQ_MODEL") or "openai/gpt-oss-20b"
GROQ_MODEL_ORDER = os.getenv("GROQ_MODEL_ORDER") or os.getenv("GROQ_MODEL") or "openai/gpt-oss-20b"


def build_faq_context(db: Session) -> str:
    faqs  = db.query(FAQ).filter(FAQ.is_active == True).all()
    store = db.query(StoreInfo).first()
    menus = db.query(Menu).filter(Menu.is_active == True).all()

    faq_list  = "\n".join([f"Q: {f.question}\nA: {f.answer}" for f in faqs])
    store_txt = ""
    if store:
        store_txt = f"매장명: {store.name}, 영업시간: {store.open_time}~{store.close_time}, 공지: {store.notice or '없음'}"
    menu_list = "\n".join([
        f"- {m.name}{' : ' + m.description if m.description else ''} (알레르기 유발 성분: {m.allergens or '없음'})"
        for m in menus
    ])

    return f"[FAQ]\n{faq_list}\n\n[매장정보]\n{store_txt}\n\n[메뉴 정보]\n{menu_list}"


def build_order_context(db: Session) -> str:
    menus = db.query(Menu).filter(Menu.is_active == True).all()

    def _fmt_opts(opts):
        if not opts: return ''
        parts = [f"{o['name']}({'·'.join(c['label'] for c in o.get('choices', []))})" for o in opts]
        return f" [{', '.join(parts)}]"

    menu_list = "\n".join([
        f"- {m.name} ({m.price}원){' [품절]' if m.is_sold_out else ''}{_fmt_opts(m.options or [])}"
        f"{' : ' + m.description if m.description else ''}"
        for m in menus
    ])

    return f"[메뉴]\n{menu_list}"


async def _request_groq(client: httpx.AsyncClient, api_key: str, model: str, messages: list) -> dict:
    res = await client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
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


async def call_groq(model: str, system_prompt: str, user_text: str, context: str, state: dict) -> dict:
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
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-6:]:
        role = "user" if h.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": prompt})
    retry_msg = {"role": "user", "content": "반드시 JSON만 출력해줘. 다른 텍스트 없이 { 로 시작하는 JSON만."}

    async with httpx.AsyncClient(timeout=25.0) as client:
        for attempt in range(5):
            try:
                return await _request_groq(client, api_key, model, messages)
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


ALLERGEN_KEYWORDS = ["알레르기", "성분", "우유", "계란", "달걀", "밀", "글루텐", "대두", "콩", "견과류", "땅콩", "호두", "아몬드"]


def _has_faq_match(user_text: str, faqs, menus) -> bool:
    for faq in faqs:
        keywords = faq.keywords or []
        if any(kw in user_text for kw in keywords):
            return True
        if faq.question:
            words = [w for w in faq.question.split() if len(w) >= 2]
            if any(w in user_text for w in words):
                return True
    if any(kw in user_text for kw in ALLERGEN_KEYWORDS) and any(m.name in user_text for m in menus):
        return True
    return False


async def _chat_faq(req: AgentRequest, db: Session) -> AgentResponse:
    faqs    = db.query(FAQ).filter(FAQ.is_active == True).all()
    menus   = db.query(Menu).filter(Menu.is_active == True).all()
    context = build_faq_context(db)

    try:
        result = await call_groq(GROQ_MODEL_FAQ, SYSTEM_PROMPT_FAQ, req.text, context, req.state)
    except Exception as e:
        print(f"[agent error] {type(e).__name__}: {e}")
        return AgentResponse(**{
            "class":    "FAQ",
            "response": "잘 듣지 못했어요. 다시 한 번 말씀해 주시겠어요?",
        })

    response_text = result.get("response", "잘 듣지 못했어요. 다시 한 번 말씀해 주시겠어요?")
    if not _has_faq_match(req.text, faqs, menus):
        response_text = "해당 정보는 카운터에 문의해 주세요."

    return AgentResponse(**{"class": "FAQ", "response": response_text})


async def _chat_order(req: AgentRequest, db: Session) -> AgentResponse:
    context = build_order_context(db)

    try:
        result = await call_groq(GROQ_MODEL_ORDER, SYSTEM_PROMPT_ORDER, req.text, context, req.state)
    except Exception as e:
        print(f"[agent error] {type(e).__name__}: {e}")
        return AgentResponse(**{
            "class":    "ORDER",
            "response": "잘 듣지 못했어요. 다시 한 번 말씀해 주시겠어요?",
        })

    cls = result.get("class")
    if cls not in ("ORDER", "RECOMMEND"):
        cls = "ORDER"

    return AgentResponse(**{
        "class":    cls,
        "response": result.get("response", "잘 듣지 못했어요. 다시 한 번 말씀해 주시겠어요?"),
        "action":   result.get("action", "none"),
        "items":    result.get("items") or [],
        "menus":    result.get("menus") or [],
    })


@router.post("/chat", response_model=AgentResponse)
async def chat(req: AgentRequest, db: Session = Depends(get_db)):
    mode = req.state.get('mode', 'faq')
    if mode == 'order':
        return await _chat_order(req, db)
    return await _chat_faq(req, db)
