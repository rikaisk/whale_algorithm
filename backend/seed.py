"""
더미 데이터 시딩 스크립트.
백엔드가 실행 중일 때 사용: python seed.py
"""
import requests
import time

BASE = "http://localhost:8000"


def post(path, body):
    r = requests.post(f"{BASE}{path}", json=body)
    r.raise_for_status()
    return r.json()


def get(path):
    r = requests.get(f"{BASE}{path}")
    r.raise_for_status()
    return r.json()


users = [
    ("alice",   "서울에서 카페 투어 중인 바리스타. 커피, 독서, 여행을 좋아합니다."),
    ("bob",     "스타트업 개발자. 알고리즘, 오픈소스, 사이클링에 관심 있어요."),
    ("carol",   "음식 블로거. 맛집 탐방, 요리, 사진 찍기가 취미입니다."),
    ("dave",    "대학원생. 머신러닝, 수학, 등산을 즐깁니다."),
    ("eve",     "프리랜서 디자이너. 일러스트, 음악, 영화 감상이 일상이에요."),
]

posts_data = [
    ("alice",  "오늘 을지로에서 발견한 숨겨진 카페, 원두가 정말 신선했어요!"),
    ("bob",    "Dijkstra 알고리즘을 직접 구현해 봤는데 생각보다 재미있네요."),
    ("carol",  "광장시장 육회 비빔밥, 역시 최고! 서울 맛집 탐방 계속됩니다."),
    ("dave",   "GAN 논문 리뷰 끝. 생성 모델이 이렇게 발전할 줄은 몰랐어요."),
    ("eve",    "새 포스터 시리즈 완성! 재즈 페스티벌 테마로 작업했습니다."),
    ("alice",  "핸드드립 커피를 집에서 내리기 시작했어요. 그라인더가 관건!"),
    ("bob",    "오픈소스 컨트리뷰션 첫 PR 머지됐습니다. 뿌듯하네요 😊"),
    ("carol",  "제주도 흑돼지 vs 서울 삼겹살, 여러분의 선택은?"),
]

print("=== 유저 등록 ===")
user_ids = {}
for username, bio in users:
    try:
        res = post("/users/register", {"username": username, "bio": bio})
        user_ids[username] = res["id"]
        print(f"  {username}: {res['interests']}")
    except Exception as e:
        print(f"  {username} 이미 존재하거나 오류: {e}")
        try:
            profile = get(f"/users/{username}")
            user_ids[username] = profile["id"]
        except Exception:
            pass

time.sleep(0.5)

print("\n=== 팔로우 관계 설정 ===")
follows = [
    ("alice", "bob"), ("alice", "carol"),
    ("bob",   "alice"), ("bob", "dave"),
    ("carol", "alice"), ("carol", "eve"),
    ("dave",  "bob"), ("dave", "eve"),
    ("eve",   "carol"), ("eve", "alice"),
]
for src, tgt in follows:
    try:
        post(f"/users/{src}/follow/{tgt}", {})
        print(f"  {src} → {tgt}")
    except Exception as e:
        print(f"  {src} → {tgt}: {e}")

time.sleep(0.5)

print("\n=== 게시글 작성 ===")
post_ids = []
for username, content in posts_data:
    try:
        res = post("/posts", {"author_username": username, "content": content})
        post_ids.append(res["id"])
        print(f"  [{username}] {content[:30]}... → {res['hashtags']}")
    except Exception as e:
        print(f"  오류: {e}")

time.sleep(0.5)

print("\n=== 좋아요 추가 ===")
for i, pid in enumerate(post_ids[:5]):
    for _ in range((i + 1) * 2):
        try:
            post(f"/posts/{pid}/like", {})
        except Exception:
            pass
print("  완료")

time.sleep(0.5)

if post_ids:
    print("\n=== 댓글 추가 ===")
    target_post = post_ids[0]
    try:
        c1 = post(f"/posts/{target_post}/comments",
                  {"author_id": user_ids.get("bob", ""), "content": "정말 좋아 보이네요!"})
        print(f"  루트 댓글: {c1['id'][:8]}...")
        reply = post(f"/comments/{c1['id']}/replies",
                     {"author_id": user_ids.get("carol", ""), "content": "저도 가보고 싶어요!"})
        print(f"  대댓글: {reply['id'][:8]}...")
    except Exception as e:
        print(f"  오류: {e}")

print("\n시딩 완료!")
