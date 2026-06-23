from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from models.models import Order

router = APIRouter()

class OrderCreate(BaseModel):
    items: List[dict]
    total: int

class OrderOut(BaseModel):
    id:     int
    items:  list
    total:  int
    status: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[OrderOut])
def get_orders(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.created_at.desc()).all()

@router.post("/", status_code=201, response_model=OrderOut)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    order = Order(items=body.items, total=body.total, status="paid")
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
