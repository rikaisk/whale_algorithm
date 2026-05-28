from fastapi import APIRouter, Query

from core.store import search_trie, post_store, tag_index
from algorithms.kmp import kmp_search
import core.solar as solar

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/users")
def search_users(q: str = Query(..., min_length=1)):
    results = search_trie.search(q)
    return {"query": q, "results": results}


@router.get("/posts")
def search_posts(q: str = Query(..., min_length=1)):
    matched_ids: set[str] = set()

    if q in tag_index:
        matched_ids.update(tag_index[q])

    for post in post_store.values():
        if post.id not in matched_ids and kmp_search(post.content, q):
            matched_ids.add(post.id)

    results = []
    for post_id in matched_ids:
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        tag_match = q in post.hashtags
        score = (3 if tag_match else 0) + post.likes * 0.1
        results.append({
            "id": post.id,
            "author_id": post.author_id,
            "content": post.content,
            "hashtags": post.hashtags,
            "likes": post.likes,
            "score": score,
            "created_at": post.created_at,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"query": q, "results": results}


@router.get("/expand")
async def expand_search(q: str = Query(..., min_length=1)):
    expanded = await solar.expand_keywords(q)
    keywords = [q] + expanded

    matched_ids: set[str] = set()
    for kw in keywords:
        if kw in tag_index:
            matched_ids.update(tag_index[kw])
        for post in post_store.values():
            if post.id not in matched_ids and kmp_search(post.content, kw):
                matched_ids.add(post.id)

    results = []
    for post_id in matched_ids:
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        results.append({
            "id": post.id,
            "content": post.content,
            "hashtags": post.hashtags,
            "likes": post.likes,
            "created_at": post.created_at,
        })

    results.sort(key=lambda x: x["likes"], reverse=True)
    return {"query": q, "expanded_keywords": expanded, "results": results}
