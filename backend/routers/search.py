from fastapi import APIRouter

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.store import search_trie, tag_index, post_store, user_store
from core.solar import expand_keywords
from algorithms.kmp import kmp_search

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/users")
def search_users(q: str = ""):
    if not q:
        return []
    results = search_trie.search(q)
    return results[:20]


@router.get("/posts")
def search_posts(q: str = ""):
    if not q:
        return []

    matched_post_ids = set()

    # 1. tag_index에서 keyword 직접 조회
    if q in tag_index:
        matched_post_ids.update(tag_index[q])

    # 2. KMP로 전체 포스트 content에서 keyword 탐색
    for post in post_store.values():
        if kmp_search(post.content.lower(), q.lower()):
            matched_post_ids.add(post.id)

    # 3. 스코어 계산 및 정렬
    results = []
    for post_id in matched_post_ids:
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        tag_match = 1 if q in post.hashtags else 0
        score = tag_match * 3 + post.likes
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
            "score": score,
            "created_at": post.created_at,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


@router.get("/expand")
async def expand_search(q: str = ""):
    if not q:
        return {"keywords": [], "results": []}

    keywords = await expand_keywords(q)

    all_results = []
    seen = set()
    for kw in [q] + keywords:
        if kw in tag_index:
            for post_id in tag_index[kw]:
                if post_id not in seen and post_store.exists(post_id):
                    seen.add(post_id)
                    post = post_store.get(post_id)
                    author_username = ""
                    for u in user_store.values():
                        if u.id == post.author_id:
                            author_username = u.username
                            break
                    all_results.append({
                        "id": post.id,
                        "author_username": author_username,
                        "content": post.content,
                        "hashtags": post.hashtags,
                        "likes": post.likes,
                        "created_at": post.created_at,
                    })

    return {"keywords": keywords, "results": all_results}
