# AI 음성인식 키오스크

## 실행

```bash
# 1. 환경변수 파일 생성
cp .env.example .env
# .env 에서 API 키 입력 (아래 환경변수 섹션 참고)

# 2. 실행
docker compose up --build

# 키오스크: http://localhost:3000/kiosk
# 어드민:   http://localhost:3000/admin
# API 문서: http://localhost:8000/docs
```

## 환경변수

`.env` 파일에 아래 항목을 채워야 합니다.

| 변수 | 설명 | 발급처 |
|------|------|--------|
| `GROQ_API_KEY` | LLM 호출용 API 키 | [console.groq.com](https://console.groq.com) |
| `CLOVA_CLIENT_ID` | 네이버 Clova STT/TTS 앱 ID | [클라우드 콘솔](https://console.ncloud.com) |
| `CLOVA_CLIENT_SECRET` | 네이버 Clova STT/TTS 앱 시크릿 | 동일 |
| `DATABASE_URL` | PostgreSQL 접속 URL | 기본값: Docker Compose 내 DB |

```env
GROQ_API_KEY=gsk_...
CLOVA_CLIENT_ID=...
CLOVA_CLIENT_SECRET=...
DATABASE_URL=postgresql://kiosk:kiosk1234@db:5432/kiosk
```

## 구조

```
/kiosk            키오스크 화면 (고객용)
/admin
  /menus          메뉴 추가·수정·품절 관리
  /faq            FAQ 등록 + AI가 못 답한 질문 목록
  /store          영업시간·주차·와이파이 등 매장 정보
  /orders         주문 내역 조회
```

## AI 동작 방식

### 응답 구조

AI(`/api/agent/chat`)는 고객 발화를 받아 아래 필드를 포함한 JSON을 반환합니다.

| 필드 | 값 | 설명 |
|------|----|------|
| `intent` | `order` \| `faq` \| `complaint` \| `unclear` | 발화 의도 |
| `items` | 배열 | 주문 파싱 결과 (intent=order일 때만 유효) |
| `reply` | 문자열 | 고객에게 보여줄 한국어 답변 |
| `ui_action` | `next_step` \| `stay` \| `call_staff` \| `fallback` | 화면 동작 지시 |
| `answered_from_context` | `true` \| `false` | DB 컨텍스트(메뉴·FAQ·매장정보)로 답했으면 true |

### 미답변 질문 수집

`answered_from_context=false`인 발화는 `unanswered_questions` 테이블에 자동 저장됩니다.  
어드민 **FAQ 관리** 화면 하단에서 목록을 확인하고, 자주 나오는 질문을 FAQ로 등록할 수 있습니다.

AI는 컨텍스트 밖의 내용을 **절대 지어내지 않고** 직원 호출로 연결합니다.  
미답변 질문을 쌓아뒀다가 실제 빈도가 높은 항목만 FAQ로 추가하는 방식으로 운영합니다.

### Groq 모델 제약

현재 모델: `llama-3.3-70b-versatile` (기본값, `GROQ_MODEL` 환경변수로 변경 가능)

`llama-3.3-70b-versatile`은 `response_format: json_schema`를 지원하지 않습니다.  
`response_format: json_object`를 사용하며, 스키마 준수는 시스템 프롬프트로 유도합니다.  
JSON 파싱이 실패할 경우 1회 자동 재시도 후, 그래도 실패하면 502를 반환합니다.

`json_schema` (strict 모드)를 사용하려면 Groq에서 지원하는 모델로 교체하세요.  
→ [Groq Structured Outputs 지원 모델 목록](https://console.groq.com/docs/structured-outputs#supported-models)

## 기술 스택

- Frontend: React + Vite (React Router)
- Backend:  FastAPI + SQLAlchemy
- DB:       PostgreSQL
- LLM:      Groq (`llama-3.3-70b-versatile`)
- STT/TTS:  네이버 Clova
- 배포:     Docker Compose
