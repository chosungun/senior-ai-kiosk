from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from database import get_db
from models.models import FAQ

router = APIRouter()

class FAQCreate(BaseModel):
    question: str
    answer:   str
    keywords: Optional[List[str]] = []

class FAQUpdate(BaseModel):
    question:  Optional[str] = None
    answer:    Optional[str] = None
    keywords:  Optional[List[str]] = None
    is_active: Optional[bool] = None

class FAQOut(BaseModel):
    id:        int
    question:  str
    answer:    str
    keywords:  list
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[FAQOut])
def get_faqs(db: Session = Depends(get_db)):
    return db.query(FAQ).filter(FAQ.is_active == True).all()

@router.post("/", status_code=201, response_model=FAQOut)
def create_faq(body: FAQCreate, db: Session = Depends(get_db)):
    faq = FAQ(**body.model_dump())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

@router.patch("/{faq_id}", response_model=FAQOut)
def update_faq(faq_id: int, body: FAQUpdate, db: Session = Depends(get_db)):
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ를 찾을 수 없어요")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(faq, k, v)
    db.commit()
    db.refresh(faq)
    return faq

@router.delete("/{faq_id}", status_code=204)
def delete_faq(faq_id: int, db: Session = Depends(get_db)):
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ를 찾을 수 없어요")
    db.delete(faq)
    db.commit()
