from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import menu, faq, store, order, agent, voice
from database import engine
from models.models import Base, Menu, FAQ, StoreInfo
from sqlalchemy.orm import Session

app = FastAPI(title="AI 키오스크 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menu.router,  prefix="/api/menus",  tags=["메뉴"])
app.include_router(faq.router,   prefix="/api/faqs",   tags=["FAQ"])
app.include_router(store.router, prefix="/api/store",  tags=["매장정보"])
app.include_router(order.router, prefix="/api/orders", tags=["주문"])
app.include_router(agent.router, prefix="/api/agent",  tags=["AI Agent"])
app.include_router(voice.router, prefix="/api/voice",  tags=["음성"])

@app.on_event("startup")
def startup():
    # 테이블 자동 생성
    Base.metadata.create_all(bind=engine)

    # 초기 데이터 (가상 카페 "아날로그" 메뉴)
    db = Session(bind=engine)
    try:
        MENU_SEED = [
            # ── 커피 ──────────────────────────────────────────────
            Menu(name="아메리카노", category="커피", price=2000,
                 description="쓴맛이 강하고 단맛은 거의 없어요. 진한 에스프레소를 물로 희석해 깔끔하게 즐길 수 있어요.",
                 options=[
                     {"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]},
                     {"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}
                 ]),
            Menu(name="카페라떼", category="커피", price=3000,
                 description="에스프레소에 우유를 넣어 부드럽고 고소해요. 쓴맛이 적고 은은한 단맛이 있어요.",
                 options=[
                     {"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]},
                     {"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}
                 ]),
            Menu(name="바닐라라떼", category="커피", price=3500,
                 description="바닐라 시럽을 더해 달콤하고 향긋해요. 커피 향보다 바닐라 향이 도드라져 단맛을 좋아하시는 분께 잘 맞아요.",
                 options=[
                     {"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]},
                     {"name": "샷", "choices": [{"label":"기본","price":0},{"label":"추가","price":500}]}
                 ]),
            Menu(name="카라멜마키아토", category="커피", price=3800,
                 description="달콤한 카라멜 소스와 우유가 어우러져 꽤 달아요. 커피 쓴맛은 적고 디저트처럼 즐길 수 있어요.",
                 options=[
                     {"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]},
                     {"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}
                 ]),
            Menu(name="카푸치노", category="커피", price=3300,
                 description="에스프레소에 우유 거품을 풍성하게 올렸어요. 쓴맛과 고소함이 균형 있고 거품이 부드러워요.",
                 options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
            Menu(name="헤이즐넛라떼", category="커피", price=3500,
                 description="헤이즐넛 시럽을 더해 고소하고 달콤해요. 견과류 향이 진하고 카페라떼보다 단맛이 강해요.",
                 options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
            Menu(name="콜드브루", category="커피", price=3500,
                 description="차갑게 장시간 추출해 쓴맛이 적고 부드러워요. 단맛은 거의 없고 깔끔한 커피 향이 오래 남아요.",
                 options=[{"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}]),
            Menu(name="아인슈페너", category="커피", price=4500,
                 description="진한 에스프레소 위에 생크림을 얹은 비엔나 커피예요. 크림의 달콤함과 커피의 쓴맛이 한 번에 느껴져요.",
                 options=[{"name": "샷", "choices": [{"label":"기본","price":0},{"label":"추가","price":500}]}]),

            # ── 논커피 ────────────────────────────────────────────
            Menu(name="초코라떼", category="논커피", price=3500,
                 description="진한 초콜릿과 우유가 어우러져 달콤하고 묵직해요. 초콜릿 향이 풍부하고 달달한 음료를 좋아하시는 분께 잘 맞아요.",
                 options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
            Menu(name="그린티라떼", category="논커피", price=3500,
                 description="말차 가루와 우유를 섞어 쌉쌀하면서도 고소해요. 단맛은 적당하고 녹차 특유의 향긋한 풀내음이 나요.",
                 options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
            Menu(name="딸기라떼", category="논커피", price=4000,
                 description="딸기 베이스에 우유를 더해 상큼하고 달콤해요. 과일 향이 풍부하고 새콤달콤한 맛이 특징이에요.",
                 options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
            Menu(name="고구마라떼", category="논커피", price=4000,
                 description="구운 고구마 퓨레와 우유를 블렌딩해 고소하고 부드럽게 달아요. 구수한 고구마 향이 진하게 나요.",
                 options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),

            # ── 티/에이드 ─────────────────────────────────────────
            Menu(name="자몽에이드", category="티에이드", price=3800,
                 description="자몽의 새콤씁쓸한 맛에 탄산을 더해 청량감이 강해요. 단맛보다 새콤한 맛이 강하고 뒷맛이 살짝 쌉쌀해요.",
                 options=[{"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}]),
            Menu(name="레몬에이드", category="티에이드", price=3800,
                 description="상큼한 레몬즙과 탄산이 어우러져 시원하고 새콤해요. 달콤하면서 레몬 특유의 상큼함이 살아 있어요.",
                 options=[{"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}]),
            Menu(name="청포도에이드", category="티에이드", price=3800,
                 description="청포도의 달콤한 향과 탄산이 만나 가볍고 청량해요. 새콤달콤하고 과일 향이 풍부해요.",
                 options=[{"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}]),
            Menu(name="캐모마일티", category="티에이드", price=3000,
                 description="카페인이 없는 꽃차로 달지 않고 은은하게 달콤한 꽃향기가 나요. 자극 없이 편안하게 즐기기 좋아요.",
                 options=[]),

            # ── 디저트 ────────────────────────────────────────────
            Menu(name="치즈케이크", category="디저트", price=4500,
                 description="진하고 부드러운 크림치즈 맛이 나요. 달콤하면서 치즈의 고소한 산미가 균형을 이뤄요.",
                 options=[]),
            Menu(name="크로플", category="디저트", price=3800,
                 description="크로아상 반죽을 와플 기계에 구워 겉은 바삭하고 속은 부드러워요. 버터 향이 진하고 고소하게 달아요.",
                 options=[{"name": "아이스크림", "choices": [{"label":"없음","price":0},{"label":"추가","price":1000}]}]),
            Menu(name="초코머핀", category="디저트", price=3000,
                 description="촉촉한 초콜릿 반죽에 초코칩이 가득해요. 달콤하고 진한 초콜릿 맛이 나요.",
                 options=[]),
            Menu(name="마카롱 3구 세트", category="디저트", price=5000,
                 description="당일 준비된 3가지 맛 마카롱이에요. 바삭한 꼬끄와 달콤한 필링이 조화로워요.",
                 options=[]),
        ]

        if db.query(Menu).count() == 0:
            db.add_all(MENU_SEED)
        else:
            # description이 비어있는 메뉴만 채워넣기 (기존 DB 대응)
            desc_map = {m.name: m.description for m in MENU_SEED}
            for menu in db.query(Menu).all():
                if not menu.description and desc_map.get(menu.name):
                    menu.description = desc_map[menu.name]

        if db.query(FAQ).count() == 0:
            faqs = [
                FAQ(question="화장실 어디예요?",      answer="매장 안쪽 오른편에 있어요.",        keywords=["화장실"]),
                FAQ(question="주차 가능한가요?",       answer="건물 지하 1층 주차장 이용 가능해요.", keywords=["주차"]),
                FAQ(question="포인트 적립 되나요?",    answer="아날로그 앱으로 적립 가능해요.",   keywords=["포인트","적립"]),
                FAQ(question="텀블러 할인 되나요?",    answer="개인 텀블러 지참 시 300원 할인돼요.", keywords=["텀블러","할인"]),
            ]
            db.add_all(faqs)

        if db.query(StoreInfo).count() == 0:
            db.add(StoreInfo(
                name="아날로그",
                open_time="08:00",
                close_time="22:00",
                notice="오늘의 추천 메뉴: 아인슈페너",
            ))

        db.commit()
        print("✅ 초기 데이터 로드 완료")
    finally:
        db.close()

@app.get("/")
def root():
    return {"status": "ok"}