from sqlalchemy import Column, Integer, String, Boolean, Float, JSON, Text, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()


class Menu(Base):
    __tablename__ = "menus"

    id          = Column(Integer, primary_key=True)
    name        = Column(String(100), nullable=False)     # 아이스 아메리카노
    category    = Column(String(50), nullable=False)      # 커피 / 논커피 / 디저트
    price       = Column(Integer, nullable=False)         # 원 단위
    image_url   = Column(String(500))
    description = Column(Text)
    is_sold_out = Column(Boolean, default=False)
    is_active   = Column(Boolean, default=True)
    options     = Column(JSON, default=list)
    # options 예시:
    # [{"name": "온도", "choices": [{"label":"ICE","price":0},{"label":"HOT","price":0}]},
    #  {"name": "사이즈", "choices": [{"label":"보통","price":0},{"label":"크게","price":500}]}]
    created_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class FAQ(Base):
    __tablename__ = "faqs"

    id       = Column(Integer, primary_key=True)
    question = Column(String(200), nullable=False)   # 화장실 어디예요?
    answer   = Column(Text, nullable=False)          # 1층 입구 오른쪽이에요
    keywords = Column(JSON, default=list)            # ["화장실", "restroom"]
    is_active = Column(Boolean, default=True)


class StoreInfo(Base):
    __tablename__ = "store_info"

    id           = Column(Integer, primary_key=True)
    name         = Column(String(100), nullable=False)
    open_time    = Column(String(20))                # "09:00"
    close_time   = Column(String(20))                # "22:00"
    address      = Column(String(200))
    phone        = Column(String(20))
    notice       = Column(Text)                      # "오늘 녹차라떼 품절"
    parking_info = Column(Text)
    wifi_info    = Column(Text)


class Order(Base):
    __tablename__ = "orders"

    id         = Column(Integer, primary_key=True)
    items      = Column(JSON, nullable=False)         # 주문 항목 배열
    total      = Column(Integer, nullable=False)      # 총 금액
    status     = Column(String(20), default="pending")  # pending/paid/cancelled
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


