from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db
from models.models import Order
from routers.auth import verify_token

router = APIRouter()

class OrderCreate(BaseModel):
    items: List[dict]
    total: int
    dine_type: Optional[str] = None  # dine_in / takeout

class OrderOut(BaseModel):
    id:        int
    items:     list
    total:     int
    status:    str
    dine_type: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[OrderOut])
def get_orders(db: Session = Depends(get_db), _=Depends(verify_token)):
    return db.query(Order).order_by(Order.created_at.desc()).all()

@router.post("/", status_code=201, response_model=OrderOut)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    order = Order(items=body.items, total=body.total, status="paid", dine_type=body.dine_type)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
