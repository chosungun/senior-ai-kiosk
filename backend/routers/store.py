from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from models.models import StoreInfo

router = APIRouter()

class StoreUpdate(BaseModel):
    name:         Optional[str] = None
    open_time:    Optional[str] = None
    close_time:   Optional[str] = None
    notice:       Optional[str] = None
    parking_info: Optional[str] = None
    wifi_info:    Optional[str] = None

class StoreOut(BaseModel):
    id:           int
    name:         str
    open_time:    Optional[str]
    close_time:   Optional[str]
    address:      Optional[str]
    phone:        Optional[str]
    notice:       Optional[str]
    parking_info: Optional[str]
    wifi_info:    Optional[str]

    class Config:
        from_attributes = True

@router.get("/", response_model=Optional[StoreOut])
def get_store(db: Session = Depends(get_db)):
    return db.query(StoreInfo).first()

@router.patch("/", response_model=StoreOut)
def update_store(body: StoreUpdate, db: Session = Depends(get_db)):
    store = db.query(StoreInfo).first()
    if not store:
        # 없으면 새로 생성
        store = StoreInfo(name="메가커피", **body.model_dump(exclude_none=True))
        db.add(store)
    else:
        for k, v in body.model_dump(exclude_none=True).items():
            setattr(store, k, v)
    db.commit()
    db.refresh(store)
    return store
