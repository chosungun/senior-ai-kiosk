import os
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.models import Menu

router = APIRouter()

CLOVA_ID            = os.getenv("CLOVA_CLIENT_ID")
CLOVA_SECRET        = os.getenv("CLOVA_CLIENT_SECRET")
CLOVA_SPEECH_SECRET = os.getenv("CLOVA_SPEECH_SECRET")  # CLOVA Speech(키워드 부스팅용, CSR과 별개 앱)


def _ncp_headers(content_type: str) -> dict:
    return {
        "X-NCP-APIGW-API-KEY-ID": CLOVA_ID,
        "X-NCP-APIGW-API-KEY":    CLOVA_SECRET,
        "Content-Type":           content_type,
    }


# 옵션/명령어는 잘못 인식되면 주문 전체가 틀어지므로 메뉴명보다 먼저(우선순위 높게) 부스팅
_STATIC_BOOST_WORDS = [
    "아이스", "따뜻하게", "시원하게", "사이즈", "아이스크림", "샷", "샷추가", "라떼", "크로플",
    "처음으로", "결제할게요", "직원불러줘", "취소할래",
]


def _build_boostings(db: Session) -> str:
    # CLOVA Speech boostings: 탭으로 구분된 단어 목록, 단어당 3자 이상, 전체 512자 이하
    menu_names = [m.name for (m,) in db.query(Menu.name).filter(Menu.is_active == True).all() if len(m.name) >= 3]
    words = _STATIC_BOOST_WORDS + menu_names

    boosting = ""
    for word in words:
        candidate = f"{boosting}\t{word}" if boosting else word
        if len(candidate) > 512:
            break
        boosting = candidate
    return boosting


@router.post("/stt")
async def stt(audio: UploadFile = File(...), db: Session = Depends(get_db)):
    data = await audio.read()

    if CLOVA_SPEECH_SECRET:
        params = {"lang": "Kor"}
        boostings = _build_boostings(db)
        if boostings:
            params["boostings"] = boostings
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                "https://clovaspeech-gw.ncloud.com/recog/v1/stt",
                headers={
                    "X-CLOVASPEECH-API-KEY": CLOVA_SPEECH_SECRET,
                    "Content-Type":          "application/octet-stream",
                },
                params=params,
                content=data,
            )
    else:
        # CLOVA_SPEECH_SECRET 미설정 시 기존 CSR(키워드 부스팅 미지원)로 폴백
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                "https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor",
                headers=_ncp_headers("application/octet-stream"),
                content=data,
            )

    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Clova STT 오류: {res.text}")
    return res.json()  # {"text": "..."}


class TTSRequest(BaseModel):
    text:    str
    speaker: str = "vdaeseong"


@router.post("/tts")
async def tts(req: TTSRequest):
    url_path = "/tts-premium/v1/tts"
    # 노년층 난청 대응: pitch 양수(낮게), alpha 음수(낮고 따뜻한 음색), emotion 중립. speed는 너무 느리지 않도록 소폭만 낮춤
    body     = f"speaker={req.speaker}&volume=0&speed=1&pitch=2&alpha=-2&emotion=0&format=mp3&text={req.text}".encode()
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"https://naveropenapi.apigw.ntruss.com{url_path}",
            headers=_ncp_headers("application/x-www-form-urlencoded"),
            content=body,
        )
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Clova TTS 오류: {res.text}")
    return StreamingResponse(iter([res.content]), media_type="audio/mpeg")
