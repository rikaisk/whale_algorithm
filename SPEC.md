# AlgoSNS — 구현 명세서

## 프로젝트 개요

알고리즘 수업 개념(Hash, BST, Trie, KMP, Heap, Graph, BFS, Dijkstra, DFS)을 실제 SNS 기능에 직접 적용한 웹 애플리케이션.
LLM(Upstage Solar API)의 출력이 알고리즘의 입력으로 연결되는 구조가 핵심.

- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI (Python)
- **DB**: 없음 — 모든 데이터는 서버 인메모리 자료구조로 관리
- **LLM**: Upstage Solar API (`solar-mini`)
- **포트**: Frontend `5173`, Backend `8000`

---

## 구현 진행 상황

### Backend — 알고리즘 (algorithms/)

| 파일 | 상태 | 설명 |
|------|------|------|
| hash_table.py | **DONE** | djb2 해시 + 체이닝 충돌 처리, set/get/delete/exists/values |
| bst.py | **DONE** | BST insert/delete/inorder/range_query (타임라인용) |
| trie.py | **DONE** | Trie insert/search/delete (자동완성용) |
| kmp.py | **DONE** | KMP failure function + 문자열 매칭 |
| heap.py | **DONE** | Max-Heap push/pop/top_k (추천 Top-K용) |
| graph.py | **DONE** | Graph + BFS 추천 + Dijkstra 경로 (소셜 그래프용) |

### Backend — Core (core/)

| 파일 | 상태 | 설명 |
|------|------|------|
| models.py | **DONE** | User, Post, Comment dataclass 정의 |
| store.py | **DONE** | 전역 인메모리 스토어 (HashTable, BST, Trie, Graph 인스턴스) |
| solar.py | **DONE** | Solar API 클라이언트 (async, fail-safe) |

### Backend — 라우터 (routers/)

| 파일 | 상태 | 엔드포인트 |
|------|------|-----------|
| users.py | **DONE** | 회원가입, 프로필 조회/수정, 팔로우/언팔로우, 친구 목록 |
| posts.py | **DONE** | 게시글 CRUD, 좋아요, 피드(Following), 전체 게시글(For You) |
| comments.py | **DONE** | 루트 댓글/대댓글 작성, 삭제, DFS 트리 조회 |
| search.py | **DONE** | 유저 자동완성(Trie), 게시글 검색(KMP), 키워드 확장(Solar) |
| recommend.py | **DONE** | 게시글 추천(Heap Top-K), 사람 추천(BFS), 인맥 경로(Dijkstra) |

### Backend — 기타

| 파일 | 상태 | 설명 |
|------|------|------|
| main.py | **DONE** | FastAPI 앱 + CORS + 라우터 등록 + 서버 시작 시 자동 시드 |
| seed.py | **DONE** | 25명 유저, 100개 게시글, 125개 팔로우, 31개 댓글+대댓글 |

### Frontend — 페이지

| 파일 | 상태 | 설명 |
|------|------|------|
| HomePage.tsx | **DONE** | 로그인/회원가입 (탭 전환 방식) |
| FeedPage.tsx | **DONE** | For You(전체 게시글) / Following(팔로잉 피드) 탭 |
| ProfilePage.tsx | **DONE** | 프로필 조회, Bio 수정, 팔로우/언팔로우, 유저 게시글 목록 |
| SearchPage.tsx | **DONE** | Users(Trie) / Posts(KMP) / Expand(Solar) 탭 |
| FriendsPage.tsx | **DONE** | Following / Followers / Discover(BFS추천) / Connection(Dijkstra경로) |
| PostDetailPage.tsx | **DONE** | 게시글 상세, 좋아요, 댓글 트리(DFS), 대댓글 |

### Frontend — 기타

| 파일 | 상태 | 설명 |
|------|------|------|
| api.ts | **DONE** | Backend API 클라이언트 (fetch 기반) |
| App.tsx | **DONE** | 라우팅, 네비게이션 바, 로그인 상태 관리 |
| index.css | **DONE** | 전체 UI 스타일링 (카드, 버튼, 탭, 댓글 트리 등) |

### 테스트

| 파일 | 상태 | 설명 |
|------|------|------|
| test_hash_table.py | **DONE** | HashTable CRUD, 충돌 처리, values() |
| test_bst.py | **DONE** | BST insert/delete/inorder/range_query |
| test_trie.py | **DONE** | Trie insert/search/delete |
| test_kmp.py | **DONE** | KMP 문자열 매칭 |
| test_heap.py | **DONE** | MaxHeap push/pop/top_k |
| test_graph.py | **DONE** | Graph BFS/Dijkstra |
| test_integration.py | **DONE** | API 엔드포인트 통합 테스트 |

---

## 프로젝트 구조

```
algosns/
├── backend/
│   ├── main.py                   # FastAPI 앱 진입점 (자동 시드 로드)
│   ├── seed.py                   # 더미 데이터 시딩 (25유저, 100게시글)
│   ├── core/
│   │   ├── models.py             # User, Post, Comment dataclass
│   │   ├── store.py              # 전역 인메모리 스토어 (싱글턴)
│   │   └── solar.py              # Solar API 클라이언트
│   ├── routers/
│   │   ├── users.py              # 프로필, 팔로우/언팔로우, 친구 목록
│   │   ├── posts.py              # 게시글 CRUD, 피드, 전체 게시글
│   │   ├── comments.py           # 댓글 트리 (DFS)
│   │   ├── search.py             # 검색 (Trie + KMP + Solar)
│   │   └── recommend.py          # 추천 (Heap + BFS + Dijkstra)
│   └── algorithms/
│       ├── hash_table.py         # Hash Table (djb2, chaining)
│       ├── bst.py                # BST (타임라인)
│       ├── trie.py               # Trie (자동완성)
│       ├── kmp.py                # KMP (문자열 매칭)
│       ├── heap.py               # Max-Heap (Top-K)
│       └── graph.py              # Graph + BFS + Dijkstra
├── tests/
│   ├── test_hash_table.py
│   ├── test_bst.py
│   ├── test_trie.py
│   ├── test_kmp.py
│   ├── test_heap.py
│   ├── test_graph.py
│   └── test_integration.py
└── frontend/
    └── src/
        ├── api.ts                # API 클라이언트
        ├── App.tsx               # 라우터, 네비게이션
        ├── index.css             # 글로벌 스타일
        └── pages/
            ├── HomePage.tsx      # 로그인/회원가입
            ├── FeedPage.tsx      # For You / Following 피드
            ├── ProfilePage.tsx   # 프로필
            ├── SearchPage.tsx    # 검색
            ├── FriendsPage.tsx   # 친구 (팔로잉/팔로워/추천/경로)
            └── PostDetailPage.tsx # 게시글 상세 + 댓글
```

---

## 데이터 모델 (`backend/core/models.py`)

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class User:
    id: str                        # UUID
    username: str
    bio: str
    interests: list[str]           # Solar가 추출한 관심사 태그
    following: list[str]           # 팔로우하는 user_id 목록
    followers: list[str]           # 팔로워 user_id 목록
    post_ids: list[str]
    created_at: float              # UNIX timestamp

@dataclass
class Post:
    id: str                        # UUID
    author_id: str
    content: str
    hashtags: list[str]            # Solar가 추출한 해시태그
    likes: int
    comment_ids: list[str]
    created_at: float

@dataclass
class Comment:
    id: str                        # UUID
    post_id: str
    author_id: str
    content: str
    parent_id: Optional[str]       # None이면 루트 댓글, 값이 있으면 대댓글
    children: list[str]            # 자식 comment_id 목록
    created_at: float
```

---

## 전역 스토어 (`backend/core/store.py`)

모든 라우터가 공유하는 싱글턴 인메모리 저장소.

```python
from algorithms.hash_table import HashTable
from algorithms.bst import BST
from algorithms.trie import Trie
from algorithms.graph import Graph
from algorithms.heap import MaxHeap

# 유저 저장: username -> User
user_store = HashTable()

# 포스트 저장: post_id -> Post
post_store = HashTable()

# 댓글 저장: comment_id -> Comment
comment_store = HashTable()

# 피드 타임라인: (timestamp, post_id) 를 key로 BST에 삽입
feed_tree = BST()

# 검색 자동완성: username을 Trie에 삽입
search_trie = Trie()

# 태그 역인덱스: hashtag -> set of post_ids (Python dict 사용)
tag_index: dict[str, set[str]] = {}

# 소셜 그래프: user_id 노드, 팔로우 관계 방향 엣지
social_graph = Graph()
```

---

## 알고리즘 구현 명세 (`backend/algorithms/`)

> **규칙**: `algorithms/` 내 파일은 Python 내장 자료구조(heapq, sortedcontainers 등) 사용 금지. 모두 직접 구현.

### hash_table.py

chaining 방식으로 충돌 처리.

```python
class HashTable:
    def __init__(self, size=1024): ...

    def _hash(self, key: str) -> int:
        # djb2 알고리즘 사용

    def set(self, key: str, value) -> None: ...
    def get(self, key: str): ...          # O(1) average
    def delete(self, key: str) -> None: ...
    def exists(self, key: str) -> bool: ...
    def values(self) -> list: ...          # 전체 값 순회
```

### bst.py

포스트 타임라인 정렬용. key는 `(timestamp, post_id)` 튜플.

```python
class BSTNode:
    key: tuple        # (timestamp, post_id)
    left: 'BSTNode | None'
    right: 'BSTNode | None'

class BST:
    def insert(self, key: tuple) -> None: ...           # O(log n)
    def delete(self, key: tuple) -> None: ...
    def inorder(self) -> list[tuple]: ...               # 오름차순 전체 반환
    def range_query(self, t1: float, t2: float) -> list[tuple]: ...  # 기간 필터
```

### trie.py

username 자동완성 및 해시태그 prefix 검색용.

```python
class TrieNode:
    children: dict[str, 'TrieNode']
    is_end: bool
    data: any   # 끝 노드에 username 또는 태그 원본 저장

class Trie:
    def insert(self, word: str, data=None) -> None: ...
    def search(self, prefix: str) -> list: ...    # O(m + k), m=prefix길이, k=결과수
    def delete(self, word: str) -> None: ...
```

### kmp.py

게시글 본문 키워드 탐색용.

```python
def build_failure(pattern: str) -> list[int]: ...

def kmp_search(text: str, pattern: str) -> bool:
    # failure function 계산 후 탐색
    # O(n + m), n=text길이, m=pattern길이
    ...
```

### heap.py

게시글 추천 Top-K 추출용.

```python
class MaxHeap:
    def __init__(self): ...
    def push(self, score: float, post_id: str) -> None: ...
    def pop(self) -> tuple[float, str]: ...               # (score, post_id)
    def top_k(self, items: list[tuple], k: int) -> list[tuple]: ...  # O(n log k)
```

### graph.py

소셜 관계 그래프. 방향 그래프(팔로우 방향).

```python
class Graph:
    def __init__(self): ...
    def add_node(self, user_id: str) -> None: ...
    def add_edge(self, from_id: str, to_id: str) -> None: ...    # 팔로우
    def remove_edge(self, from_id: str, to_id: str) -> None: ... # 언팔로우
    def neighbors(self, user_id: str) -> list[str]: ...

    def bfs_recommend(self, start_id: str, depth: int = 2) -> dict[str, int]:
        # start_id 기준 depth hop 이내 유저와 공통 친구 수 반환
        # return: {user_id: common_friend_count}
        # 이미 팔로우 중인 유저는 결과에서 제외

    def dijkstra_path(self, start_id: str, end_id: str) -> list[str]:
        # 두 유저 간 최단 인맥 경로 반환 (user_id 목록)
        # 엣지 가중치 = 1 / (공통 관심사 수 + 1)
```

---

## 기능별 API 명세

### Feature 1 — 프로필 (Profile)

**자료구조**: Hash Table | **알고리즘**: Hashing | **Solar**: 관심사 태그 추출

```
POST   /users/register              유저 등록 (username, bio)
GET    /users/{username}            프로필 조회 — HashTable.get(username)
PATCH  /users/{username}/bio        소개글 수정 → Solar로 관심사 태그 재추출
GET    /users/{username}/friends    팔로잉/팔로워 목록 조회
```

**등록 로직**:
1. `user_store.exists(username)` 중복 체크
2. UUID 생성
3. Solar 호출 → interests 태그 추출
4. `user_store.set(username, user)`
5. `search_trie.insert(username)`
6. `social_graph.add_node(user.id)`

**Solar 프롬프트**:
```
"다음 소개글에서 관심사 키워드를 최대 5개 추출해. JSON 배열로만 답해.\n소개글: {bio}"
응답 예시: ["여행", "음식", "독서", "음악", "운동"]
```

---

### Feature 2 — 게시글 (Posts)

**자료구조**: BST (타임라인), Hash Table (post 조회) | **Solar**: 해시태그 추출

```
POST   /posts                       게시글 작성
GET    /posts/all                   전체 게시글 조회 (For You 피드)
GET    /posts/{post_id}             게시글 상세 조회
DELETE /posts/{post_id}             게시글 삭제
POST   /posts/{post_id}/like        좋아요 토글
GET    /feed/{username}             팔로잉 피드 조회 (Following 탭)
```

**작성 로직**:
1. Solar 호출 → hashtags 추출
2. `post_store.set(post.id, post)`
3. `feed_tree.insert((post.created_at, post.id))`
4. 각 hashtag → `tag_index[tag].add(post.id)`

**피드 조회 로직**:
1. following 목록 조회
2. `feed_tree.inorder()` → 시간순 post_id 목록
3. following 유저 post만 필터링 후 최신순 반환

**Solar 프롬프트**:
```
"다음 게시글에서 해시태그를 정확히 3개 추출해. # 없이 JSON 배열로만 답해.\n내용: {content}"
응답 예시: ["맛집", "서울", "브런치"]
```

---

### Feature 3 — 검색 (Search)

**자료구조**: Trie (자동완성), Inverted Index (태그 역인덱스) | **알고리즘**: Trie 탐색, KMP | **Solar**: 키워드 확장

```
GET    /search/users?q={prefix}     유저 자동완성 (Trie)
GET    /search/posts?q={keyword}    게시글 검색 (KMP + Inverted Index)
GET    /search/expand?q={keyword}   Solar 키워드 확장 후 재검색
```

**게시글 검색 로직**:
1. `tag_index`에서 keyword 직접 조회
2. KMP로 전체 포스트 content에서 keyword 탐색
3. Ranking Score(태그 매칭 여부 + 좋아요 수) 기준 정렬 후 반환

**Solar 프롬프트**:
```
"'{keyword}'와 관련된 검색 키워드를 5개 추천해. JSON 배열로만 답해."
응답 예시: ["카페", "커피", "디저트", "브런치", "베이커리"]
```

---

### Feature 4 — 게시글 추천 (Post Recommendation)

**자료구조**: Hash Table (역인덱스), Max-Heap (Top-K) | **알고리즘**: Scoring, Greedy | **Solar**: 관심사 분석

```
GET    /recommend/posts/{username}  맞춤 게시글 추천 (Top 20)
```

**추천 로직**:
1. Solar 호출 → 유저 최근 게시글 + bio 분석 → 관심사 태그 추출
2. `tag_index`에서 관심사 태그로 후보 post_id 수집
3. 각 후보 Score 계산:
   ```
   score = (태그 일치 수 × 3) + (좋아요 수 × 0.1) + 최신성 보정값
   최신성 보정값 = max(0, 1 - (현재시간 - created_at) / 86400)
   ```
4. Max-Heap으로 Top-20 추출

**Solar 프롬프트**:
```
"사용자의 소개글과 최근 게시글을 분석해서 관심사 키워드를 최대 7개 추출해. JSON 배열로만 답해.\n소개글: {bio}\n최근 게시글: {posts_sample}"
응답 예시: ["음식", "여행", "카페", "사진", "서울", "맛집", "일상"]
```

---

### Feature 5 — 사람 추천 (People Recommendation)

**자료구조**: Graph (인접 리스트), Queue (BFS), Priority Queue (Dijkstra) | **Solar**: 없음

```
POST   /users/{username}/follow/{target}            팔로우
DELETE /users/{username}/follow/{target}            언팔로우
GET    /recommend/people/{username}                 알 수도 있는 사람 추천
GET    /recommend/path/{from_username}/{to_username} 인맥 경로
```

**BFS 추천 로직**:
1. `social_graph.bfs_recommend(user_id, depth=2)` 호출
2. 반환된 `{user_id: common_count}` 내림차순 정렬
3. 이미 팔로우 중인 유저, 본인 제외 후 Top-10 반환

**Dijkstra 경로 로직**:
1. `social_graph.dijkstra_path(from_id, to_id)` 호출
2. 엣지 가중치 = `1 / (공통 관심사 수 + 1)`
3. 반환된 user_id 경로를 username으로 변환

---

### Feature 6 — 답글 (Reply / Comment)

**자료구조**: N-ary Tree (Comment.children 리스트), Hash Table (comment 조회) | **알고리즘**: DFS, Timestamp 정렬 | **Solar**: 없음

```
POST   /posts/{post_id}/comments        루트 댓글 작성
POST   /comments/{comment_id}/replies   대댓글 작성
DELETE /comments/{comment_id}           댓글 삭제
GET    /posts/{post_id}/comments        댓글 트리 전체 조회
```

**DFS 트리 조회 로직**:
```python
def get_comment_tree(comment_id: str) -> dict:
    comment = comment_store.get(comment_id)
    # 같은 depth 자식들은 created_at 오름차순 정렬
    sorted_children = sorted(
        comment.children,
        key=lambda cid: comment_store.get(cid).created_at
    )
    return {
        "comment": comment,
        "replies": [get_comment_tree(child_id) for child_id in sorted_children]  # DFS 재귀
    }
```

---

## 시드 데이터 (`backend/seed.py`)

서버 시작 시 `main.py`의 `on_startup` 이벤트에서 자동 로드됨.

| 항목 | 수량 |
|------|------|
| 유저 | 25명 (다양한 관심사: 카페, 개발, 운동, 음악, 요리, 게임, 패션, 영화 등) |
| 게시글 | 100개 (유저당 4개, 해시태그 포함) |
| 팔로우 관계 | 125개 (밀도 높은 소셜 그래프) |
| 댓글 | 31개 (루트 댓글 + 대댓글) |

시드 유저: `jimin`, `subin`, `minjun`, `yuna`, `dongho`, `soyeon`, `hyunwoo`, `eunji`, `taehyung`, `minji`, `jihoon`, `hayoung`, `seojin`, `woojin`, `nayeon`, `chanwoo`, `soojin`, `jungwon`, `dahyun`, `sunwoo`, `arin`, `gunwoo`, `yerin`, `taemin`, `chaeyoung`

---

## Frontend 페이지 구성

| 페이지 | 경로 | 기능 | 사용 알고리즘 |
|--------|------|------|-------------|
| HomePage | `/` | 로그인/회원가입 (탭 전환) | Hash Table (유저 조회) |
| FeedPage | `/feed/:username` | For You(전체) / Following(팔로잉) 피드 | BST (시간순 정렬) |
| ProfilePage | `/profile/:username` | 프로필, Bio 수정, 팔로우 | Hash Table, Solar |
| SearchPage | `/search` | 유저 검색 / 게시글 검색 / 키워드 확장 | Trie, KMP, Solar |
| FriendsPage | `/friends/:username` | 팔로잉/팔로워/추천친구/인맥경로 | BFS, Dijkstra |
| PostDetailPage | `/post/:postId` | 게시글 상세, 좋아요, 댓글 트리 | DFS (댓글 순회) |

---

## Solar API 클라이언트 (`backend/core/solar.py`)

```python
import httpx, os, json

SOLAR_API_KEY = os.getenv("SOLAR_API_KEY")
BASE_URL = "https://api.upstage.ai/v1/solar"

async def chat(prompt: str) -> str:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {SOLAR_API_KEY}"},
            json={
                "model": "solar-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            },
            timeout=15.0
        )
        return res.json()["choices"][0]["message"]["content"]

# Solar 실패 시 빈 리스트 반환 (fail-safe)
async def extract_interests(bio: str) -> list[str]: ...
async def extract_hashtags(content: str) -> list[str]: ...
async def expand_keywords(keyword: str) -> list[str]: ...
async def analyze_interests(bio: str, posts_sample: str) -> list[str]: ...
```

---

## 환경 변수

`.env`:
```
SOLAR_API_KEY=your_api_key_here
```

---

## 실행 방법

```bash
# Backend
cd backend
pip install fastapi uvicorn httpx python-dotenv
uvicorn main:app --reload --port 8000
# → 서버 시작 시 시드 데이터 자동 로드

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Tests
cd algosns
python -m pytest tests/ -v
```

---

## 알고리즘 — 기능 대응표

| 알고리즘 / 자료구조 | 적용 기능 | 구현 파일 | 시간 복잡도 |
|-------------------|---------|----------|----------|
| Hash Table (djb2 + chaining) | 유저/게시글/댓글 저장 | algorithms/hash_table.py | O(1) avg |
| BST | 피드 타임라인 정렬 | algorithms/bst.py | O(log n) insert, O(n) inorder |
| Trie | 유저 자동완성, 태그 prefix | algorithms/trie.py | O(m + k) search |
| KMP | 게시글 본문 키워드 매칭 | algorithms/kmp.py | O(n + m) |
| Max-Heap | 추천 게시글 Top-K | algorithms/heap.py | O(n log k) |
| Graph + BFS | 사람 추천 (2-hop) | algorithms/graph.py | O(V + E) |
| Graph + Dijkstra | 인맥 경로 | algorithms/graph.py | O((V+E) log V) |
| N-ary Tree + DFS | 댓글 트리 조회 | routers/comments.py | O(n) |
| Inverted Index | 해시태그 → 게시글 역인덱스 | core/store.py | O(1) lookup |

### Solar API 연동 지점

| 호출 위치 | 입력 | 출력 | 연결되는 알고리즘 |
|---------|-----|-----|----------------|
| 유저 등록 / bio 수정 | 소개글 | 관심사 태그 (최대 5개) | Hash Table 저장, Graph 가중치 |
| 게시글 작성 | 게시글 내용 | 해시태그 (3개) | Inverted Index 등록 |
| 게시글 추천 | bio + 최근 게시글 | 관심사 태그 (최대 7개) | Max-Heap 스코어링 입력 |
| 키워드 확장 검색 | 검색어 | 관련 키워드 (5개) | Trie + KMP 재탐색 |
