from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from database import get_db
from models.models import Menu

router = APIRouter()

# ── 스키마 ────────────────────────────────────────────────────────
class MenuCreate(BaseModel):
    name:        str
    category:    str
    price:       int
    image_url:   Optional[str] = None
    description: Optional[str] = None
    options:     Optional[list] = []

class MenuUpdate(BaseModel):
    name:        Optional[str] = None
    price:       Optional[int] = None
    is_sold_out: Optional[bool] = None
    is_active:   Optional[bool] = None
    options:     Optional[list] = None

class MenuOut(BaseModel):
    id:          int
    name:        str
    category:    str
    price:       int
    image_url:   Optional[str]
    description: Optional[str]
    is_sold_out: bool
    is_active:   bool
    options:     list

    class Config:
        from_attributes = True

# ── 엔드포인트 ────────────────────────────────────────────────────
@router.get("/", response_model=List[MenuOut])
def get_menus(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    q = db.query(Menu)
    if active_only:
        q = q.filter(Menu.is_active == True)
    if category:
        q = q.filter(Menu.category == category)
    return q.all()

@router.post("/", status_code=201, response_model=MenuOut)
def create_menu(body: MenuCreate, db: Session = Depends(get_db)):
    menu = Menu(**body.model_dump())
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu

@router.patch("/{menu_id}", response_model=MenuOut)
def update_menu(menu_id: int, body: MenuUpdate, db: Session = Depends(get_db)):
    menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없어요")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(menu, k, v)
    db.commit()
    db.refresh(menu)
    return menu

@router.delete("/{menu_id}", status_code=204)
def delete_menu(menu_id: int, db: Session = Depends(get_db)):
    menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없어요")
    db.delete(menu)
    db.commit()
