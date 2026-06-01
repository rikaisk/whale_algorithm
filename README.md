# WhaleGram 

알고리즘 수업 개념을 실제 SNS 기능에 직접 적용한 인스타그램풍 웹 애플리케이션.
LLM(Upstage Solar)의 출력이 직접 구현한 자료구조의 입력으로 연결되는 구조가 핵심.

> 앱 제품명은 **WhaleGram**(`backend/main.py`의 FastAPI title, 프런트 UI 기준).
> 더 자세한 구현 명세는 [`SPEC.md`](./SPEC.md), 코드 근거 기술 보고서는 [`TECHNICAL_REPORT.md`](./TECHNICAL_REPORT.md) 참고.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19 + Vite + TypeScript (axios) |
| Backend | FastAPI (Python) + WebSocket(DM/알림) |
| 저장 | DB 없음 — 직접 구현한 인메모리 자료구조 + `backend/data.json` 파일 영속화 |
| LLM | Upstage Solar API (`solar-mini`) |
| 이미지 | loremflickr (주제 키워드 기반 핫링크) |
| 배포 | Render (static frontend + python backend), `deploy` 브랜치 |

## 알고리즘 → 기능 대응

| 알고리즘 | SNS 기능 | 구현 |
|----------|----------|------|
| Hash Table (djb2 + chaining) | 유저/포스트/댓글/메시지 저장 | `algorithms/hash_table.py` |
| BST | 피드 타임라인 정렬 `(timestamp, post_id)` | `algorithms/bst.py` |
| Trie | 유저명 자동완성 | `algorithms/trie.py` |
| KMP | 게시글 본문 키워드 검색 | `algorithms/kmp.py` |
| Graph + BFS + Dijkstra | 팔로우 그래프, 공통친구 추천, 가까운 친구/인맥 경로 | `algorithms/graph.py` |
| Max-Heap | 자료구조 구현(테스트 보유). ※ 현재 추천 라우터는 정렬 기반이라 미사용 | `algorithms/heap.py` |

## 주요 기능

- **피드/게시물**: 작성(이미지·Solar 해시태그 자동추출)·좋아요·좋아요한 사람 목록·삭제.
- **댓글/답글**: N-ary 트리(DFS), 댓글·답글 좋아요, 5초 폴링 실시간 갱신.
- **검색**: 유저명 자동완성(Trie), 본문 검색(KMP+태그 역인덱스), Solar 키워드 확장.
- **추천**: 친구(기본 탭)·관심분야 게시물·공통친구(BFS)·가까운 친구(Dijkstra).
- **메시지(DM)**: WebSocket 실시간 채팅, AI 유저 자동 응답, 대화별 스크롤 위치 보존.
- **알림**: 댓글/답글/멘션 토스트(우하단, 아래→위), 클릭 시 근원 게시물·댓글로 이동,
  우선순위 병합, 모두끄기·유지시간(1~15초)·투명도·음량 설정.
- **AI 더미 유저**: 정체성/관심사가 다른 20명(시작 시 자동 시드), persona 기반 DM 응답.
- **가이드 봇**: Solar 기반 사용법 안내(대화 맥락·세션 서버 저장).

## 실행 방법

### 사전 준비

```bash
# backend/.env 생성
SOLAR_API_KEY=your_api_key_here   # 없어도 동작하나 Solar 기반 기능은 fallback
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

### 더미 데이터

AI 더미 유저는 백엔드 시작(lifespan)에서 자동 시드됩니다(`backend/routers/admin.py`).

## API 엔드포인트 (요약)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/login` · `/logout`, GET `/me` | 인증 |
| GET/PUT | `/me/search_history` · `/me/bot_sessions` | 개인 데이터(서버 보관) |
| POST | `/users/register` | 유저 등록(관심분야) |
| GET | `/users/{username}` · `/posts` · `/followers` · `/following` | 프로필 |
| PATCH | `/users/{username}/bio` · `/avatar` | 소개(Solar 관심사 추출)·아바타 |
| POST/DELETE | `/users/{username}/follow/{target}` | 팔로우/언팔로우 |
| POST | `/posts` (Solar 해시태그) · `/posts/{id}/like` | 게시물 |
| GET | `/posts/{id}` · `/posts/{id}/likers` · `/feed/{username}` | 단일/좋아요·피드 |
| POST | `/posts/{id}/comments` · `/comments/{id}/replies` · `/comments/{id}/like` | 댓글 |
| GET | `/posts/{id}/comments` | 댓글 트리(DFS) |
| GET | `/search/users` · `/search/posts` · `/search/expand` | 검색(Trie/KMP/Solar) |
| GET | `/recommend/posts/{u}` · `/people/{u}` · `/closest/{u}` · `/path/{a}/{b}` | 추천 |
| POST/GET | `/messages` · `/messages/{peer}` · `/messages/unread_count` | DM |
| WS | `/ws?token=` | 메시지 + 알림 실시간 |
| POST | `/chatbot/ask` | 가이드 봇 |
| GET | `/admin/interest_categories` | 관심 분야 선택지 |

## 프로젝트 구조

```
whale_algorithm/
├── backend/
│   ├── main.py                 # FastAPI 앱, CORS, 쓰기 시 자동 저장 미들웨어, lifespan 시드
│   ├── requirements.txt
│   ├── seed.py
│   ├── core/                   # models·store·persistence·auth·mentions·solar
│   ├── algorithms/             # hash_table·bst·trie·kmp·heap·graph (직접 구현)
│   └── routers/                # auth·profile·posts·comments·search·recommend·messages·admin·chatbot
├── frontend/
│   ├── src/
│   │   ├── api/                # client.ts·searchHistory.ts·botSessions.ts
│   │   ├── components/         # Avatar·PostCard·PostFocusModal·Notifications
│   │   ├── hooks/              # useIsMobile
│   │   └── pages/              # Feed·Profile·Search·Recommend·Chat
│   ├── public/                 # favicon.svg
│   └── package.json · vite.config.ts
├── tests/                      # pytest 단위 테스트(자료구조 6종, 61 passed)
├── render.yaml                 # Render 배포 정의(static web + python api)
├── SPEC.md · TECHNICAL_REPORT.md
└── README.md
```

## 테스트

```bash
pytest        # algorithms 단위 테스트 (61 passed)
```
