import os
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

CLOVA_ID     = os.getenv("CLOVA_CLIENT_ID")
CLOVA_SECRET = os.getenv("CLOVA_CLIENT_SECRET")


def _ncp_headers(content_type: str) -> dict:
    return {
        "X-NCP-APIGW-API-KEY-ID": CLOVA_ID,
        "X-NCP-APIGW-API-KEY":    CLOVA_SECRET,
        "Content-Type":           content_type,
    }


@router.post("/stt")
async def stt(audio: UploadFile = File(...)):
    data     = await audio.read()
    url_path = "/recog/v1/stt?lang=Kor"
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"https://naveropenapi.apigw.ntruss.com{url_path}",
            headers=_ncp_headers("application/octet-stream"),
            content=data,
        )
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Clova STT 오류: {res.text}")
    return res.json()  # {"text": "..."}


class TTSRequest(BaseModel):
    text:    str
    speaker: str = "nara"


@router.post("/tts")
async def tts(req: TTSRequest):
    url_path = "/tts-premium/v1/tts"
    body     = f"speaker={req.speaker}&volume=0&speed=0&pitch=0&format=mp3&text={req.text}".encode()
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"https://naveropenapi.apigw.ntruss.com{url_path}",
            headers=_ncp_headers("application/x-www-form-urlencoded"),
            content=body,
        )
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Clova TTS 오류: {res.text}")
    return StreamingResponse(iter([res.content]), media_type="audio/mpeg")
