from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import menu, faq, store, order, agent
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

@app.on_event("startup")
def startup():
    # 테이블 자동 생성
    Base.metadata.create_all(bind=engine)

    # 초기 데이터 (메가커피 메뉴)
    db = Session(bind=engine)
    try:
        if db.query(Menu).count() == 0:
            menus = [
                Menu(name="아이스 아메리카노", category="커피", price=2000,
                     options=[
                         {"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]},
                         {"name": "샷", "choices": [{"label":"기본","price":0},{"label":"추가","price":500}]}
                     ]),
                Menu(name="아메리카노",      category="커피", price=2000,
                     options=[
                         {"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]},
                         {"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}
                     ]),
                Menu(name="카페라떼",        category="커피", price=3000,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="바닐라라떼",      category="커피", price=3500,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="카라멜마키아토",  category="커피", price=3500,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="초코라떼",        category="커피", price=3500,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="녹차라떼",        category="커피", price=3500,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="딸기라떼",        category="논커피", price=4000,
                     options=[{"name": "온도", "choices": [{"label":"HOT","price":0},{"label":"ICE","price":0}]}]),
                Menu(name="자몽에이드",      category="논커피", price=3500, options=[]),
                Menu(name="레몬에이드",      category="논커피", price=3500, options=[]),
                Menu(name="치즈케이크",      category="디저트", price=4500, options=[]),
                Menu(name="크로플",          category="디저트", price=3500, options=[]),
            ]
            db.add_all(menus)

        if db.query(FAQ).count() == 0:
            faqs = [
                FAQ(question="화장실 어디예요?",      answer="매장 안쪽 오른편에 있어요.",        keywords=["화장실"]),
                FAQ(question="주차 가능한가요?",       answer="건물 지하 1층 주차장 이용 가능해요.", keywords=["주차"]),
                FAQ(question="와이파이 비밀번호가 뭐예요?", answer="카운터에 문의해 주세요.",      keywords=["와이파이","wifi"]),
                FAQ(question="포인트 적립 되나요?",    answer="메가MGC커피 앱으로 적립 가능해요.", keywords=["포인트","적립"]),
                FAQ(question="텀블러 할인 되나요?",    answer="개인 텀블러 지참 시 300원 할인돼요.", keywords=["텀블러","할인"]),
            ]
            db.add_all(faqs)

        if db.query(StoreInfo).count() == 0:
            db.add(StoreInfo(
                name="메가MGC커피",
                open_time="08:00",
                close_time="22:00",
                notice="오늘의 추천 메뉴: 아이스 아메리카노",
            ))

        db.commit()
        print("✅ 초기 데이터 로드 완료")
    finally:
        db.close()

@app.get("/")
def root():
    return {"status": "ok"}
