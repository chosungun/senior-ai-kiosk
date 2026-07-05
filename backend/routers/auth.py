import os
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "change-this-secret")
ALGORITHM = "HS256"
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin1234")

bearer = HTTPBearer()

_hashed_password = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt())


class LoginRequest(BaseModel):
    username: str
    password: str


def create_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("sub") != ADMIN_USERNAME:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/login")
def login(body: LoginRequest):
    if body.username != ADMIN_USERNAME or not bcrypt.checkpw(body.password.encode(), _hashed_password):
        raise HTTPException(status_code=401, detail="잘못된 아이디 또는 비밀번호입니다")
    return {"access_token": create_token(body.username), "token_type": "bearer"}
