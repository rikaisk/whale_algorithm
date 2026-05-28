import time
from fastapi import APIRouter, HTTPException

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.store import user_store, post_store, tag_index, social_graph
from core.solar import analyze_interests
from algorithms.heap import MaxHeap

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.get("/posts/{username}")
async def recommend_posts(username: str):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)

    # 최근 게시글 샘플
    recent_posts_text = ""
    for pid in user.post_ids[-5:]:
        if post_store.exists(pid):
            post = post_store.get(pid)
            recent_posts_text += post.content + "\n"

    # Solar로 관심사 분석
    interests = await analyze_interests(user.bio, recent_posts_text)
    if not interests:
        interests = user.interests

    # tag_index에서 후보 수집
    candidate_ids = set()
    for tag in interests:
        if tag in tag_index:
            candidate_ids.update(tag_index[tag])

    # 본인 게시글 제외
    own_posts = set(user.post_ids)
    candidate_ids -= own_posts

    # 스코어 계산
    now = time.time()
    scored_items = []
    for post_id in candidate_ids:
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        tag_match = sum(1 for tag in post.hashtags if tag in interests)
        recency = max(0, 1 - (now - post.created_at) / 86400)
        score = tag_match * 3 + post.likes * 0.1 + recency
        scored_items.append((score, post_id))

    # Max-Heap으로 Top-20 추출
    heap = MaxHeap()
    top_results = heap.top_k(scored_items, 20)

    results = []
    for score, post_id in top_results:
        post = post_store.get(post_id)
        author_username = ""
        for u in user_store.values():
            if u.id == post.author_id:
                author_username = u.username
                break
        results.append({
            "id": post.id,
            "author_username": author_username,
            "content": post.content,
            "hashtags": post.hashtags,
            "likes": post.likes,
            "score": round(score, 2),
            "created_at": post.created_at,
        })

    return results


@router.get("/people/{username}")
def recommend_people(username: str):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)

    # BFS 추천
    candidates = social_graph.bfs_recommend(user.id, depth=2)

    # 내림차순 정렬
    sorted_candidates = sorted(candidates.items(), key=lambda x: x[1], reverse=True)

    results = []
    for user_id, common_count in sorted_candidates[:10]:
        # user_id로 username 찾기
        for u in user_store.values():
            if u.id == user_id:
                results.append({
                    "user_id": user_id,
                    "username": u.username,
                    "bio": u.bio,
                    "common_friends": common_count,
                })
                break

    return results


@router.get("/path/{from_username}/{to_username}")
def find_path(from_username: str, to_username: str):
    if not user_store.exists(from_username) or not user_store.exists(to_username):
        raise HTTPException(status_code=404, detail="User not found")

    from_user = user_store.get(from_username)
    to_user = user_store.get(to_username)

    # interest_map 구성
    interest_map = {}
    for u in user_store.values():
        interest_map[u.id] = u.interests

    path_ids = social_graph.dijkstra_path(from_user.id, to_user.id, interest_map)

    # user_id -> username 변환
    path_usernames = []
    for uid in path_ids:
        for u in user_store.values():
            if u.id == uid:
                path_usernames.append(u.username)
                break

    return {"path": path_usernames, "length": len(path_ids)}
