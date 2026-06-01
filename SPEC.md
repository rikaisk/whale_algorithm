# WhaleGram — 구현 명세서 (현재 진행 현황)

알고리즘 수업 개념(Hash, BST, Trie, KMP, Heap, Graph, BFS, Dijkstra, DFS)을 실제 SNS 기능에
직접 적용하고, LLM(Upstage Solar)의 출력이 알고리즘의 입력으로 연결되는 인스타그램풍 SNS.

- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI (Python), WebSocket(DM/알림)
- **저장**: 인메모리 자료구조 + `backend/data.json` 파일 영속화
- **LLM**: Upstage Solar API (`solar-mini`)
- **이미지**: loremflickr (주제 키워드 기반, 안정적 핫링크)
- **배포**: Render (정적 frontend + FastAPI backend), `deploy` 브랜치

> ⚠️ Render free 플랜은 15분 미사용 슬립/재배포 시 컨테이너가 초기화되어 `data.json`(서버 데이터)이
> 리셋됩니다. 영구 보존이 필요하면 외부 Postgres(`DATABASE_URL`) 연동이 필요합니다(미적용).

---

## 프로젝트 구조

```
whale_algorithm/
├── backend/
│   ├── main.py                # FastAPI 앱, CORS, lifespan(AI 시드/백필), 쓰기 시 자동 저장 미들웨어
│   ├── data.json              # 영속 데이터(git 제외)
│   ├── core/
│   │   ├── models.py          # User, Post, Comment, Message dataclass
│   │   ├── store.py           # 전역 인메모리 스토어(싱글턴)
│   │   ├── persistence.py     # data.json 저장/로드
│   │   ├── auth.py            # PBKDF2 비밀번호 해시 + 토큰 인증
│   │   ├── mentions.py        # @멘션 파싱(비AI 실제 유저)
│   │   └── solar.py           # Solar API 클라이언트
│   ├── algorithms/            # 직접 구현(내장 자료구조 금지)
│   │   ├── hash_table.py      # djb2 + chaining
│   │   ├── bst.py             # (timestamp, post_id) 타임라인
│   │   ├── trie.py            # 유저명 자동완성
│   │   ├── kmp.py             # 본문 키워드 탐색
│   │   ├── heap.py            # 추천 Top-K
│   │   └── graph.py           # 팔로우 그래프 + BFS + Dijkstra(경로/전체최단)
│   └── routers/
│       ├── auth.py            # 로그인/로그아웃/me + 검색기록·봇세션 저장
│       ├── profile.py         # 등록/프로필/팔로워·팔로잉/아바타/소개
│       ├── posts.py           # 게시물/좋아요/좋아요한 사람/피드
│       ├── comments.py        # 댓글·답글 트리/좋아요/삭제
│       ├── search.py          # 유저(Trie)/게시물(KMP)/키워드 확장
│       ├── recommend.py       # 관심분야 추천/BFS 사람추천/Dijkstra 가까운 친구
│       ├── messages.py        # DM(WebSocket)·읽음·presence·알림 push
│       ├── admin.py           # AI 더미 유저/페르소나/관심분야 시드
│       └── chatbot.py         # WhaleGram 가이드 봇
├── frontend/src/
│   ├── App.tsx                # 라우팅(탭), 헤더, 전역 WebSocket, 알림 토스트, presence
│   ├── api/client.ts          # axios API 래퍼
│   ├── api/searchHistory.ts   # 검색기록(순수 헬퍼, 서버 동기화)
│   ├── api/botSessions.ts     # 가이드봇 세션 헬퍼 + 예시질문 풀
│   ├── hooks/useIsMobile.ts   # 반응형 분기
│   ├── components/
│   │   ├── Avatar.tsx
│   │   ├── PostCard.tsx       # 게시물 카드(좋아요/댓글/멘션/하이라이트/AI뱃지)
│   │   └── Notifications.tsx  # 알림 토스트 스택 + 설정(투명도/소리)
│   └── pages/
│       ├── FeedPage.tsx       # 피드 + 작성
│       ├── ProfilePage.tsx    # 프로필 + 게시물 그리드
│       ├── SearchPage.tsx     # 검색 + 가이드봇
│       ├── RecommendPage.tsx  # 게시물/사람/가까운 친구 추천
│       └── ChatPage.tsx       # 메시지(DM)
└── tests/                     # 알고리즘 단위 테스트(pytest)
```

---

## 데이터 모델 (`backend/core/models.py`)

```python
@dataclass
class User:
    id: str
    username: str
    password_hash: str                 # PBKDF2-HMAC-SHA256(salt, 100k)
    bio: str                           # 현재 회원가입 단계에서는 미입력(빈 문자열)
    interests: list[str]               # 회원가입 시 선택한 관심 분야 라벨
    following: list[str]
    followers: list[str]
    post_ids: list[str]
    avatar_base64: Optional[str] = None
    is_ai: bool = False                # AI 더미 유저 여부
    created_at: float = 0.0
    search_history: list = []          # 검색 기록(서버 보관)
    bot_sessions: list = []            # 가이드봇 대화 세션(서버 보관)

@dataclass
class Post:
    id, author_id, content, hashtags, likes, comment_ids
    image_base64: Optional[str]        # 게시물 이미지(또는 loremflickr URL)
    liked_by: list[str]                # 좋아요 누른 user_id
    created_at: float

@dataclass
class Comment:
    id, post_id, author_id, content, parent_id, children, created_at
    likes: int = 0
    liked_by: list[str] = []           # 댓글/답글 좋아요

@dataclass
class Message:                         # DM
    id, sender_id, receiver_id, content
    image_url: Optional[str]           # AI가 보낸 이미지
    created_at: float
    read: bool = False                 # 읽음 여부
```

---

## 전역 스토어 (`backend/core/store.py`)

```python
user_store    = HashTable()    # username -> User
post_store    = HashTable()    # post_id -> Post
comment_store = HashTable()    # comment_id -> Comment
message_store = HashTable()    # message_id -> Message
feed_tree     = BST()          # (created_at, post_id) 타임라인
search_trie   = Trie()         # username 자동완성
tag_index     = {}             # hashtag -> set[post_id]
social_graph  = Graph()        # 팔로우 방향 그래프
```

영속화: 모든 변경(2xx 응답) 후 미들웨어가 `persistence.save_all()` → `data.json`.

---

## 알고리즘 (`backend/algorithms/`) — 직접 구현

| 파일 | 용도 | 핵심 |
| --- | --- | --- |
| hash_table.py | 유저/게시물/댓글/메시지 저장 | djb2 해시 + chaining, O(1) 평균 |
| bst.py | 피드 타임라인 | `(timestamp, post_id)` 키, inorder/range_query |
| trie.py | 유저명 자동완성 | prefix 검색 O(m+k) |
| kmp.py | 게시물 본문 검색 | failure function, O(n+m) |
| heap.py | 게시물 추천 Top-K | Max-Heap |
| graph.py | 소셜 그래프 | BFS 공통친구 추천, `dijkstra_path`(두 유저 경로), `dijkstra_all`(단일출발 전체 최단거리) |

`graph.dijkstra_all(start, interest_map)` — 간선 가중치 `1/(공통 관심사+1)` 로 모든 도달 노드까지의
최단 거리/경로 반환 → '가까운 친구 찾기' 기능에 사용.

---

## 구현 현황 (기능별)

### 1. 인증 (`auth.py`, `profile.py`)
- 회원가입: 유저명/비밀번호 + **관심 분야 선택 단계**(자기소개 입력 제거, '넘어가기' 지원).
  유저명 중복은 입력창에서 실시간(디바운스) 안내.
- 비밀번호: PBKDF2-HMAC-SHA256 + salt + 10만 회. 토큰 기반 인증.
- 검색 기록/가이드봇 대화 내역을 서버(User 필드)에 저장 (`/me/search_history`, `/me/bot_sessions`).

### 2. 프로필 (`profile.py`)
- 프로필 조회/소개·아바타 수정/팔로우·언팔로우/팔로워·팔로잉 목록.
- 타인 프로필에 **팔로우 + 메시지 보내기** 버튼, **접속 중 🟢** 표시(online).

### 3. 게시물 (`posts.py`)
- 작성(이미지 첨부, Solar 해시태그 추출)/삭제/좋아요 토글/피드(BST 시간순).
- **좋아요 N개 클릭 → 누른 사람 목록**(`/posts/{id}/likers`).
- 본문 `@멘션`/검색어 하이라이트, **AI 작성자 'ai' 뱃지**(author_is_ai).

### 4. 댓글/답글 (`comments.py`)
- 루트 댓글/대댓글 N-ary 트리(DFS 조회, created_at 정렬), 삭제(답글 포함).
- **댓글·답글 좋아요(♥)** (`/comments/{id}/like`).
- 프론트는 펼친 동안 5초 폴링으로 실시간 갱신.

### 5. 검색 (`search.py`)
- 유저 자동완성(Trie), 게시물 본문 검색(KMP + 태그 역인덱스), Solar 키워드 확장.
- 검색 결과 게시물 본문에서 **검색어 볼드 하이라이트**.

### 6. 가이드 봇 (`chatbot.py`)
- WhaleGram 사용법 안내. **세션 분리 + 대화 내역 서버 저장**, 범용 예시 질문을 상황에 따라 무작위 노출,
  답변 후에도 예시 질문 유지. Solar에 대화 history 전달로 문맥 유지.

### 7. 추천 (`recommend.py`)
- **관심 분야 기반**: 선택한 분야와 맞는 AI 유저의 게시물('관심 있을 수도 있는 게시물')과
  사람('관심사가 비슷한 유저')을 섹션 헤더로 노출. 건너뛴 경우 무작위 '추천 친구'.
  신규 실제 유저는 최근 가입순으로 최상단.
- **사람 추천(BFS)**: 공통 친구 기반 '회원님이 알 수도 있는 사람'.
- **가까운 친구 찾기(Dijkstra)**: 공통 관심사 가중 최단거리로 가까운 순 추천(경로/촌수 표시).
  ※ 기존 '인맥 경로 찾기' UI를 대체.

### 8. 메시지 / DM (`messages.py`, `ChatPage.tsx`)
- WebSocket 실시간 채팅. **AI 유저 자동 응답**(persona 기반 Solar), 명시적 사진 요청 시에만 이미지 첨부.
- 안 읽은 메시지: 메시지 탭 빨간 배지(실시간) + 좌측 대화자별 빨간 숫자 + 좌측 패널 총합.
  **'읽음' 기준 = 해당 대화 입력칸 포커스**.
- 좌측 대화자창 '‹'로 접기(아바타만)/펼치기, 새 메시지 자동 스크롤 대신 ↓ 버튼.
- 모바일에서는 목록↔대화 단일 화면(‹ 뒤로가기).

### 9. 알림 (`Notifications.tsx` + ws `notification`)
- 댓글/답글/멘션 발생 시 **우상단 반투명 토스트가 위에서 드롭**(newest가 위, 기존 것을 아래로 밀어냄).
- 상호작용 종류별 **투명도 슬라이더 + 알림음 on/off** 설정(🔔, WebAudio 합성음), localStorage 보관.

### 10. 멘션 (`mentions.py`)
- 본문 `@유저명`으로 **비AI 실제 유저** 멘션 → 프로필 링크 + 멘션 알림.

### 11. AI 더미 유저 (`admin.py`)
- 서로 겹치지 않는 정체성/관심사의 **20명**(startup 자동 시드, 옛 이름 정리(prune)).
- 모든 게시물에 **글 내용에 맞는 이미지**(loremflickr 키워드) 첨부, persona 기반 DM 응답.
- 회원가입 관심 분야 ↔ 페르소나 매핑(`/admin/interest_categories`).

### 12. 접속 상태 / 반응형
- presence(`/presence/online`)로 접속 중 유저 표시.
- `useIsMobile`로 헤더/메시지/프로필/탭바 모바일 최적화, 스크롤 시 상단 탭 바 고정(sticky).

---

## 주요 API 요약

```
# auth
POST /login, POST /logout, GET /me
GET/PUT /me/search_history, GET/PUT /me/bot_sessions

# profile
POST /users/register            (username, password, interests[])
GET  /users/{username}          (online 포함)
GET  /users/{username}/posts | /followers | /following
PATCH /users/{username}/bio | /avatar

# posts / comments
POST /posts, DELETE /posts/{id}, POST /posts/{id}/like
GET  /posts/{id}/likers, GET /feed/{username}
POST /posts/{id}/comments, POST /comments/{id}/replies
POST /comments/{id}/like, DELETE /comments/{id}, GET /posts/{id}/comments

# search / recommend
GET  /search/users?q=, /search/posts?q=, /search/expand?q=
GET  /recommend/posts/{username}, /recommend/people/{username}
GET  /recommend/closest/{username}        # Dijkstra 가까운 친구

# messages / presence
POST /messages, GET /messages, GET /messages/{peer}
GET  /messages/unread_count, POST /messages/{peer}/read
GET  /presence/online
WS   /ws?token=...                        # 메시지 + 알림 실시간

# chatbot / admin
POST /chatbot/ask                         # question + history
GET  /admin/interest_categories
```

---

## Solar 클라이언트 (`core/solar.py`)
`chat`(system + history 지원), `extract_interests`, `extract_hashtags`, `expand_keywords`,
`analyze_interests`, `persona_reply`(AI DM), `chatbot_answer`(가이드봇),
`generate_persona`, `generate_post_for_persona`. 모든 호출은 실패 시 안전한 기본값 반환(fail-safe).

---

## 실행 방법

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`.env`: `SOLAR_API_KEY=...` (없어도 동작하나 Solar 기반 기능은 fallback).

---

## 테스트

```bash
pytest            # algorithms 단위 테스트 (61 passed)
```
