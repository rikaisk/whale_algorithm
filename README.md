# AlgoSNS

알고리즘 수업 개념(Hash, BST, Trie, KMP, Heap, Graph, BFS, Dijkstra, DFS)을 실제 SNS 기능에 적용한 웹 애플리케이션.

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI (Python)
- **DB**: In-memory (custom data structures)
- **LLM**: Upstage Solar API (`solar-mini`)

## Project Structure

```
algosns/
├── backend/
│   ├── main.py                 # FastAPI entry point (자동 시드 데이터 로드)
│   ├── seed.py                 # 더미 데이터 시딩 (25명 유저, 100개 게시글)
│   ├── core/
│   │   ├── models.py           # User, Post, Comment dataclass
│   │   ├── store.py            # Global in-memory stores
│   │   └── solar.py            # Solar API client
│   ├── routers/
│   │   ├── users.py            # Profile, follow/unfollow, friends list
│   │   ├── posts.py            # Post CRUD, feed, like, all posts
│   │   ├── search.py           # Trie autocomplete, KMP search
│   │   ├── recommend.py        # Post/People recommendation
│   │   └── comments.py         # Comment tree (DFS)
│   └── algorithms/
│       ├── hash_table.py       # Hash Table (djb2, chaining)
│       ├── bst.py              # BST (timeline)
│       ├── trie.py             # Trie (autocomplete)
│       ├── kmp.py              # KMP string matching
│       ├── heap.py             # Max-Heap (Top-K)
│       └── graph.py            # Graph + BFS + Dijkstra
├── tests/
│   ├── test_hash_table.py
│   ├── test_bst.py
│   ├── test_trie.py
│   ├── test_kmp.py
│   ├── test_heap.py
│   ├── test_graph.py
│   └── test_integration.py     # API integration tests
└── frontend/
    └── src/
        ├── api.ts              # API client
        ├── App.tsx             # Router setup
        ├── index.css           # Global styles
        └── pages/
            ├── HomePage.tsx       # Login / Register
            ├── FeedPage.tsx       # For You / Following 피드
            ├── ProfilePage.tsx    # User profile + posts
            ├── SearchPage.tsx     # Search (Trie + KMP + Solar)
            ├── FriendsPage.tsx    # Following/Followers/Discover/Connection
            └── PostDetailPage.tsx # Post detail + comment tree
```

## Algorithm-Feature Mapping

| Feature | Data Structure | Algorithm | Solar LLM |
|---------|---------------|-----------|-----------|
| Profile | Hash Table | Hashing (djb2) | Interest extraction |
| Timeline/Feed | BST | Inorder traversal | Hashtag extraction |
| Search | Trie, Inverted Index | Trie prefix search, KMP | Keyword expansion |
| Post Recommend | Hash Table, Max-Heap | Scoring, Top-K | Interest analysis |
| People Recommend | Graph (adjacency list) | BFS, Dijkstra | - |
| Comments | N-ary Tree | DFS traversal | - |

## Implementation Status

### Backend

| Module | Status | Description |
|--------|--------|-------------|
| algorithms/hash_table.py | DONE | djb2 해시 + 체이닝 충돌 처리 |
| algorithms/bst.py | DONE | BST insert/delete/inorder/range_query |
| algorithms/trie.py | DONE | Trie insert/search/delete |
| algorithms/kmp.py | DONE | KMP failure function + 문자열 매칭 |
| algorithms/heap.py | DONE | Max-Heap push/pop/top_k |
| algorithms/graph.py | DONE | Graph + BFS 추천 + Dijkstra 경로 |
| core/models.py | DONE | User, Post, Comment dataclass |
| core/store.py | DONE | 전역 인메모리 스토어 (HashTable, BST, Trie, Graph, Heap) |
| core/solar.py | DONE | Upstage Solar API 클라이언트 (async) |
| routers/users.py | DONE | 회원가입, 프로필 조회/수정, 팔로우/언팔로우, 친구 목록 |
| routers/posts.py | DONE | 게시글 CRUD, 좋아요, 피드(Following), 전체 게시글(For You) |
| routers/comments.py | DONE | 댓글/대댓글 작성/삭제, DFS 트리 조회 |
| routers/search.py | DONE | 유저 자동완성(Trie), 게시글 검색(KMP), 키워드 확장(Solar) |
| routers/recommend.py | DONE | 게시글 추천(Heap Top-K), 사람 추천(BFS), 인맥 경로(Dijkstra) |
| seed.py | DONE | 25명 유저, 100개 게시글, 125개 팔로우, 31개 댓글+대댓글 |
| main.py | DONE | FastAPI 앱 + CORS + 라우터 등록 + 자동 시드 |

### Frontend

| Page | Status | Description |
|------|--------|-------------|
| HomePage.tsx | DONE | 로그인/회원가입 (탭 전환 방식) |
| FeedPage.tsx | DONE | For You(전체 게시글) / Following(팔로잉 피드) 탭 |
| ProfilePage.tsx | DONE | 프로필 조회, Bio 수정, 팔로우/언팔로우, 유저 게시글 |
| SearchPage.tsx | DONE | Users(Trie) / Posts(KMP) / Expand(Solar) 탭 |
| FriendsPage.tsx | DONE | Following / Followers / Discover(BFS추천) / Connection(Dijkstra경로) |
| PostDetailPage.tsx | DONE | 게시글 상세, 좋아요, 댓글 트리(DFS), 대댓글 |
| api.ts | DONE | Backend API 클라이언트 (fetch 기반) |
| App.tsx | DONE | 라우팅, 네비게이션, 로그인 상태 관리 |
| index.css | DONE | 전체 UI 스타일링 |

### Tests

| Test | Status | Description |
|------|--------|-------------|
| test_hash_table.py | DONE | HashTable CRUD, 충돌 처리, values() |
| test_bst.py | DONE | BST insert/delete/inorder/range_query |
| test_trie.py | DONE | Trie insert/search/delete |
| test_kmp.py | DONE | KMP 문자열 매칭 |
| test_heap.py | DONE | MaxHeap push/pop/top_k |
| test_graph.py | DONE | Graph BFS/Dijkstra |
| test_integration.py | DONE | API 엔드포인트 통합 테스트 |

## Seed Data

서버 시작 시 자동으로 더미 데이터가 로드됩니다:

- **25명의 유저**: 다양한 관심사 (카페, 개발, 운동, 음악, 요리, 게임, 패션, 영화 등)
- **100개의 게시글**: 유저당 4개, 해시태그 포함
- **125개의 팔로우 관계**: 밀도 높은 소셜 그래프
- **31개의 댓글/대댓글**: DFS 트리 구조

시드 유저 목록: `jimin`, `subin`, `minjun`, `yuna`, `dongho`, `soyeon`, `hyunwoo`, `eunji`, `taehyung`, `minji`, `jihoon`, `hayoung`, `seojin`, `woojin`, `nayeon`, `chanwoo`, `soojin`, `jungwon`, `dahyun`, `sunwoo`, `arin`, `gunwoo`, `yerin`, `taemin`, `chaeyoung`

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install fastapi uvicorn httpx python-dotenv
cp ../.env.example ../.env
# Edit .env and add your SOLAR_API_KEY (optional - works without it)
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run Tests

```bash
cd algosns
python -m pytest tests/ -v
```

## API Endpoints

### Users
- `POST /users/register` - Register user
- `GET /users/{username}` - Get profile
- `PATCH /users/{username}/bio` - Update bio
- `GET /users/{username}/friends` - Get following/followers list
- `POST /users/{username}/follow/{target}` - Follow
- `DELETE /users/{username}/follow/{target}` - Unfollow

### Posts
- `POST /posts` - Create post
- `GET /posts/all` - Get all posts (For You feed)
- `GET /posts/{post_id}` - Get post
- `DELETE /posts/{post_id}` - Delete post
- `POST /posts/{post_id}/like` - Like
- `GET /feed/{username}` - Get following feed

### Search
- `GET /search/users?q={prefix}` - Autocomplete (Trie)
- `GET /search/posts?q={keyword}` - Search posts (KMP)
- `GET /search/expand?q={keyword}` - Solar keyword expansion

### Recommendations
- `GET /recommend/posts/{username}` - Post recommendations (Heap)
- `GET /recommend/people/{username}` - People recommendations (BFS)
- `GET /recommend/path/{from}/{to}` - Connection path (Dijkstra)

### Comments
- `POST /posts/{post_id}/comments` - Create comment
- `POST /comments/{comment_id}/replies` - Reply (DFS tree)
- `DELETE /comments/{comment_id}` - Delete comment
- `GET /posts/{post_id}/comments` - Get comment tree

## Ports

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
