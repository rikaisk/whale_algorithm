from fastapi import APIRouter, Depends, Query

from core.store import search_trie, post_store, tag_index, user_store
from algorithms.kmp import kmp_search
from core import auth
import core.solar as solar

router = APIRouter(prefix="/search", tags=["search"])


def _id_to_username_map() -> dict[str, str]:
    return {u.id: u.username for u in user_store.values()}


def _serialize(post, id_to_name, current_user_id, extra=None):
    base = {
        "id": post.id,
        "author_id": post.author_id,
        "author_username": id_to_name.get(post.author_id, "unknown"),
        "content": post.content,
        "hashtags": post.hashtags,
        "likes": post.likes,
        "comment_count": len(post.comment_ids),
        "image_base64": post.image_base64,
        "liked_by_me": bool(current_user_id and current_user_id in post.liked_by),
        "created_at": post.created_at,
    }
    if extra:
        base.update(extra)
    return base


@router.get("/users")
def search_users(q: str = Query(..., min_length=1)):
    results = search_trie.search(q)
    return {"query": q, "results": results}


@router.get("/posts")
def search_posts(
    q: str = Query(..., min_length=1),
    current_user_id: str | None = Depends(auth.get_current_user_optional),
):
    matched_ids: set[str] = set()

    if q in tag_index:
        matched_ids.update(tag_index[q])

    for post in post_store.values():
        if post.id not in matched_ids and kmp_search(post.content, q):
            matched_ids.add(post.id)

    id_to_name = _id_to_username_map()
    results = []
    for post_id in matched_ids:
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        tag_match = q in post.hashtags
        score = (3 if tag_match else 0) + post.likes * 0.1
        results.append(_serialize(post, id_to_name, current_user_id, {"score": score}))

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"query": q, "results": results}


@router.get("/expand")
async def expand_search(
    q: str = Query(..., min_length=1),
    current_user_id: str | None = Depends(auth.get_current_user_optional),
):
    expanded = await solar.expand_keywords(q)
    keywords = [q] + expanded

    matched_ids: set[str] = set()
    for kw in keywords:
        if kw in tag_index:
            matched_ids.update(tag_index[kw])
        for post in post_store.values():
            if post.id not in matched_ids and kmp_search(post.content, kw):
                matched_ids.add(post.id)

    id_to_name = _id_to_username_map()
    results = []
    for post_id in matched_ids:
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        results.append(_serialize(post, id_to_name, current_user_id))

    results.sort(key=lambda x: x["likes"], reverse=True)
    return {"query": q, "expanded_keywords": expanded, "results": results}
