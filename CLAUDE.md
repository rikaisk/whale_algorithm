# AlgoSNS — CLAUDE.md

## 프로젝트 개요

AlgoSNS는 FastAPI 기반의 소셜 네트워크 서비스 백엔드입니다.
외부 라이브러리 대신 **직접 구현한 자료구조·알고리즘**을 실제 서비스 로직에 적용하는 것이 핵심 목표입니다.
AI 기능은 Upstage Solar API(`solar-mini` 모델)를 사용합니다.

---

## 폴더 구조

```
whale_algorithm/
├── backend/
│   ├── main.py                  # FastAPI 앱 진입점, CORS 설정
│   ├── algorithms/              # 직접 구현한 자료구조
│   │   ├── hash_table.py        # HashTable (djb2 해시, 체이닝)
│   │   ├── bst.py               # BST (이진 탐색 트리)
│   │   ├── trie.py              # Trie (자동완성)
│   │   ├── graph.py             # Graph (BFS 추천, Dijkstra 경로)
│   │   ├── heap.py              # MaxHeap (점수 기반 랭킹)
│   │   └── kmp.py               # KMP 문자열 검색
│   └── core/
│       ├── models.py            # 데이터 모델 (User, Post, Comment)
│       ├── solar.py             # Upstage Solar API 연동
│       └── store.py             # 전역 인메모리 데이터 저장소
├── frontend/                    # 프론트엔드 (미구현)
├── tests/                       # 알고리즘별 단위 테스트
├── .env.example                 # 환경변수 예시
└── .gitignore
```

---

## 알고리즘 — 역할 매핑

| 알고리즘 | 파일 | 실제 용도 |
|----------|------|-----------|
| HashTable | `algorithms/hash_table.py` | 유저·포스트·댓글 저장 (O(1) 조회) |
| BST | `algorithms/bst.py` | 피드 타임라인 정렬 및 범위 조회 |
| Trie | `algorithms/trie.py` | 유저명 검색 자동완성 |
| Graph | `algorithms/graph.py` | 소셜 그래프, 팔로우 추천(BFS), 관심사 기반 경로(Dijkstra) |
| MaxHeap | `algorithms/heap.py` | 게시글 점수 기반 Top-K 랭킹 |
| KMP | `algorithms/kmp.py` | 게시글 본문 패턴 검색 |

---

## 핵심 데이터 모델 (`core/models.py`)

- **User**: `id`, `username`, `bio`, `interests`(Solar 추출), `following`, `followers`, `post_ids`
- **Post**: `id`, `author_id`, `content`, `hashtags`(Solar 추출), `likes`, `comment_ids`
- **Comment**: `id`, `post_id`, `author_id`, `content`, `parent_id`(대댓글 지원), `children`

---

## Solar AI 연동 (`core/solar.py`)

Upstage Solar API를 비동기(`httpx`)로 호출합니다.

| 함수 | 역할 |
|------|------|
| `extract_interests(bio)` | 소개글 → 관심사 키워드 최대 5개 |
| `extract_hashtags(content)` | 게시글 → 해시태그 3개 |
| `expand_keywords(keyword)` | 검색어 → 연관 키워드 5개 |
| `analyze_interests(bio, posts)` | 소개글 + 게시글 → 관심사 키워드 최대 7개 |

모든 함수는 JSON 파싱 실패 시 빈 리스트를 반환합니다.

---

## 환경 설정

`.env` 파일을 생성하고 아래 값을 설정하세요 (`.env.example` 참고):

```
SOLAR_API_KEY=<Upstage API 키>
```

---

## 개발 시 주의사항

- `store.py`의 저장소는 **인메모리**입니다. 서버 재시작 시 데이터가 초기화됩니다.
- 알고리즘 구현체를 수정할 때는 반드시 `tests/` 의 해당 테스트를 함께 확인하세요.
- Solar API는 `temperature=0.3`으로 고정되어 있습니다. JSON 파싱에 의존하므로 프롬프트 변경 시 형식 유지에 주의하세요.
- CORS는 `http://localhost:5173`(Vite 기본 포트)만 허용됩니다.
