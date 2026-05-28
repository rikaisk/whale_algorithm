# AlgoSNS

알고리즘 수업 개념을 실제 SNS 기능에 직접 적용한 웹 애플리케이션.  
LLM(Upstage Solar API)의 출력이 알고리즘의 입력으로 연결되는 구조가 핵심.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React + Vite + TypeScript |
| Backend | FastAPI (Python) |
| DB | 없음 — 서버 인메모리 자료구조 |
| LLM | Upstage Solar API (`solar-mini`) |

## 알고리즘 → 기능 대응

| 알고리즘 | SNS 기능 |
|----------|----------|
| Hash Table (chaining) | 유저/포스트/댓글 저장 |
| BST (range_query) | 피드 타임라인 정렬 |
| Trie | 유저명 자동완성 |
| KMP | 게시글 본문 키워드 검색 |
| Max-Heap | 추천 게시글 Top-K |
| Graph + BFS + Dijkstra | 팔로우 그래프, 사람 추천, 인맥 경로 |

## 실행 방법

### 사전 준비

```bash
# .env 파일 생성 (backend/ 폴더 안)
SOLAR_API_KEY=your_api_key_here
```

### Backend

```bash
cd backend
pip install fastapi uvicorn httpx python-dotenv
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 더미 데이터 시딩 (선택)

백엔드 실행 후:

```bash
cd backend
pip install requests
python seed.py
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/users/register` | 유저 등록 + Solar 관심사 추출 |
| GET | `/users/{username}` | 프로필 조회 |
| PATCH | `/users/{username}/bio` | 소개글 수정 |
| GET | `/users/{username}/feed` | 팔로잉 피드 |
| POST | `/users/{username}/follow/{target}` | 팔로우 |
| DELETE | `/users/{username}/follow/{target}` | 언팔로우 |
| POST | `/posts` | 게시글 작성 + Solar 해시태그 추출 |
| DELETE | `/posts/{post_id}` | 게시글 삭제 |
| POST | `/posts/{post_id}/like` | 좋아요 |
| GET | `/feed/{username}` | 피드 조회 |
| GET | `/search/users?q=` | 유저 자동완성 (Trie) |
| GET | `/search/posts?q=` | 게시글 검색 (KMP + 역인덱스) |
| GET | `/search/expand?q=` | Solar 키워드 확장 재검색 |
| GET | `/recommend/posts/{username}` | 맞춤 게시글 추천 (Heap) |
| GET | `/recommend/people/{username}` | 사람 추천 (BFS) |
| GET | `/recommend/path/{from}/{to}` | 인맥 경로 (Dijkstra) |
| POST | `/posts/{post_id}/comments` | 댓글 작성 |
| POST | `/comments/{comment_id}/replies` | 대댓글 작성 |
| DELETE | `/comments/{comment_id}` | 댓글 삭제 |
| GET | `/posts/{post_id}/comments` | 댓글 트리 조회 (DFS) |

## 프로젝트 구조

```
algosns/
├── backend/
│   ├── main.py
│   ├── core/
│   │   ├── models.py      # User, Post, Comment dataclass
│   │   ├── store.py       # 전역 인메모리 스토어
│   │   └── solar.py       # Solar API 클라이언트
│   ├── algorithms/
│   │   ├── hash_table.py
│   │   ├── bst.py
│   │   ├── trie.py
│   │   ├── kmp.py
│   │   ├── heap.py
│   │   └── graph.py
│   ├── routers/
│   │   ├── profile.py
│   │   ├── posts.py
│   │   ├── search.py
│   │   ├── recommend.py
│   │   └── comments.py
│   └── seed.py
├── tests/
│   └── (pytest 단위 테스트 50개)
└── frontend/
    └── src/
        ├── api/client.ts
        ├── pages/
        │   ├── FeedPage.tsx
        │   ├── ProfilePage.tsx
        │   ├── SearchPage.tsx
        │   └── RecommendPage.tsx
        └── components/
            └── PostCard.tsx
```
