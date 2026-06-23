# AI 음성인식 키오스크

## 실행

```bash
# 1. 환경변수 세팅
cp .env .env.local
# .env.local 에서 API 키 입력

# 2. 실행
docker compose up --build

# 키오스크: http://localhost:3000/kiosk
# 어드민:   http://localhost:3000/admin
# API 문서: http://localhost:8000/docs
```

## 구조

```
/kiosk          키오스크 화면 (고객용)
/admin
  /menus        메뉴 추가·수정·품절 관리
  /faq          자주 묻는 질문 등록
  /store        영업시간·주차·와이파이 등 매장 정보
  /orders       주문 내역 조회
```

## 기술 스택

- Frontend: React + Vite (React Router)
- Backend:  FastAPI + SQLAlchemy
- DB:       PostgreSQL
- AI:       카나나 (오케스트레이터) + 클로바 STT/TTS
- 배포:     Docker Compose
