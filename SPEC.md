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

## 프로젝트 구조

```
algosns/
├── backend/
│   ├── main.py                   # FastAPI 앱 진입점, CORS 설정
│   ├── core/
│   │   ├── models.py             # User, Post, Comment dataclass 정의
│   │   ├── store.py              # 전역 인메모리 스토어 (싱글턴)
│   │   └── solar.py             # Solar API 클라이언트
│   └── algorithms/
│       ├── hash_table.py         # Hash Table 직접 구현
│       ├── bst.py                # BST 직접 구현
│       ├── trie.py               # Trie 직접 구현
│       ├── kmp.py                # KMP 문자열 매칭 직접 구현
│       ├── heap.py               # Max-Heap 직접 구현
│       └── graph.py              # Graph + BFS + Dijkstra 직접 구현
│
├── tests/
│   ├── test_hash_table.py
│   ├── test_bst.py
│   ├── test_trie.py
│   ├── test_kmp.py
│   ├── test_heap.py
│   └── test_graph.py
│
├── frontend/                     # 3주차에 채움
│   └── .gitkeep
│
├── .env                          # SOLAR_API_KEY (git 제외)
├── .env.example                  # API 키 템플릿
└── .gitignore
```

> **주의**: `routers/` 폴더는 3주차에 생성. 2주차에는 위 구조만 잡는다.

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

> **주의**: 라우터 파일(`backend/routers/`)은 3주차에 생성.

### Feature 1 — 프로필 (Profile)

**자료구조**: Hash Table | **알고리즘**: Hashing | **Solar**: 관심사 태그 추출

```
POST   /users/register              유저 등록 (username, bio)
GET    /users/{username}            프로필 조회 — HashTable.get(username)
PATCH  /users/{username}/bio        소개글 수정 → Solar로 관심사 태그 재추출
GET    /users/{username}/feed       해당 유저 팔로잉들의 피드
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
DELETE /posts/{post_id}             게시글 삭제
POST   /posts/{post_id}/like        좋아요 토글
GET    /feed/{username}             피드 조회 (시간순)
```

**작성 로직**:
1. Solar 호출 → hashtags 추출
2. `post_store.set(post.id, post)`
3. `feed_tree.insert((post.created_at, post.id))`
4. 각 hashtag → `tag_index[tag].add(post.id)`

**피드 조회 로직**:
1. following 목록 조회
2. `feed_tree.inorder()` → 시간순 post_id 목록
3. following 유저 post만 필터링 후 반환

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
async def extract_interests(bio: str) -> list[str]:
    try:
        result = await chat(f"다음 소개글에서 관심사 키워드를 최대 5개 추출해. JSON 배열로만 답해.\n소개글: {bio}")
        return json.loads(result)
    except:
        return []

async def extract_hashtags(content: str) -> list[str]:
    try:
        result = await chat(f"다음 게시글에서 해시태그를 정확히 3개 추출해. # 없이 JSON 배열로만 답해.\n내용: {content}")
        return json.loads(result)
    except:
        return []

async def expand_keywords(keyword: str) -> list[str]:
    try:
        result = await chat(f"'{keyword}'와 관련된 검색 키워드를 5개 추천해. JSON 배열로만 답해.")
        return json.loads(result)
    except:
        return []

async def analyze_interests(bio: str, posts_sample: str) -> list[str]:
    try:
        result = await chat(f"사용자의 소개글과 최근 게시글을 분석해서 관심사 키워드를 최대 7개 추출해. JSON 배열로만 답해.\n소개글: {bio}\n최근 게시글: {posts_sample}")
        return json.loads(result)
    except:
        return []
```

---

## 환경 변수

`.env`:
```
SOLAR_API_KEY=your_api_key_here
```

`.env.example`:
```
SOLAR_API_KEY=
```

`.gitignore`:
```
.env
__pycache__/
*.pyc
node_modules/
.DS_Store
```

---

## 실행 방법

```bash
# Backend
cd backend
pip install fastapi uvicorn httpx python-dotenv
uvicorn main:app --reload --port 8000

# Frontend (3주차 이후)
cd frontend
npm install
npm run dev
```

---

## 구현 순서

### 2주차 (현재)
1. 레포 세팅 + 프로젝트 구조 생성
2. `backend/algorithms/` — 6개 알고리즘 직접 구현
3. `tests/` — 각 알고리즘 단위 테스트 (`pytest` 전부 통과 목표)
4. `backend/core/models.py`, `store.py`, `solar.py` 작성

### 3주차
5. `backend/routers/` 폴더 생성 후 라우터 6개 구현
6. `frontend/` React 앱 세팅 + 페이지별 UI
7. Frontend ↔ Backend API 연동

### 4주차
8. 통합 테스트 + 버그 수정
9. 더미 데이터 시딩 스크립트 작성
10. README, 발표 슬라이드 작성
