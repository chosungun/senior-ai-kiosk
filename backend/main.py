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
        if db.query(Menu).count() == 0:
            menus = [
                # ── 커피 ──────────────────────────────────────────────
                Menu(name="아메리카노", category="커피", price=2000,
                     options=[
                         {"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]},
                         {"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}
                     ]),
                Menu(name="카페라떼", category="커피", price=3000,
                     options=[
                         {"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]},
                         {"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}
                     ]),
                Menu(name="바닐라라떼", category="커피", price=3500,
                     options=[
                         {"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]},
                         {"name": "샷", "choices": [{"label":"기본","price":0},{"label":"추가","price":500}]}
                     ]),
                Menu(name="카라멜마키아토", category="커피", price=3800,
                     options=[
                         {"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]},
                         {"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}
                     ]),
                Menu(name="카푸치노", category="커피", price=3300,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="헤이즐넛라떼", category="커피", price=3500,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="콜드브루", category="커피", price=3500,
                     options=[{"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}]),
                Menu(name="아인슈페너", category="커피", price=4500,
                     options=[{"name": "샷", "choices": [{"label":"기본","price":0},{"label":"추가","price":500}]}]),

                # ── 논커피 ────────────────────────────────────────────
                Menu(name="초코라떼", category="논커피", price=3500,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="그린티라떼", category="논커피", price=3500,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="딸기라떼", category="논커피", price=4000,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="고구마라떼", category="논커피", price=4000,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),

                # ── 티/에이드 ─────────────────────────────────────────
                Menu(name="자몽에이드", category="티에이드", price=3800,
                     options=[{"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}]),
                Menu(name="레몬에이드", category="티에이드", price=3800,
                     options=[{"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}]),
                Menu(name="청포도에이드", category="티에이드", price=3800,
                     options=[{"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}]),
                Menu(name="캐모마일티", category="티에이드", price=3000, options=[]),

                # ── 디저트 ────────────────────────────────────────────
                Menu(name="치즈케이크", category="디저트", price=4500, options=[]),
                Menu(name="크로플", category="디저트", price=3800,
                     options=[{"name": "아이스크림", "choices": [{"label":"없음","price":0},{"label":"추가","price":1000}]}]),
                Menu(name="초코머핀", category="디저트", price=3000, options=[]),
                Menu(name="마카롱 3구 세트", category="디저트", price=5000, options=[]),
            ]
            db.add_all(menus)

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