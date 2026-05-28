from fastapi import APIRouter, HTTPException
import time

from core.store import user_store, post_store, tag_index, social_graph
from algorithms.heap import MaxHeap
import core.solar as solar

router = APIRouter(tags=["recommend"])


def _build_interest_map() -> dict[str, list[str]]:
    return {u.id: u.interests for u in user_store.values()}


@router.get("/recommend/posts/{username}")
async def recommend_posts(username: str):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)
    recent_contents = []
    for post_id in user.post_ids[-5:]:
        if post_store.exists(post_id):
            post = post_store.get(post_id)
            recent_contents.append(post.content)
    posts_sample = " ".join(recent_contents)

    interests = await solar.analyze_interests(user.bio, posts_sample)
    if not interests:
        interests = user.interests

    candidate_ids: set[str] = set()
    for tag in interests:
        candidate_ids.update(tag_index.get(tag, set()))
    candidate_ids -= set(user.post_ids)

    now = time.time()
    items = []
    for post_id in candidate_ids:
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        tag_match_count = sum(1 for t in interests if t in post.hashtags)
        recency = max(0.0, 1.0 - (now - post.created_at) / 86400)
        score = tag_match_count * 3 + post.likes * 0.1 + recency
        items.append((score, post.id))

    top = MaxHeap().top_k(items, 20)

    results = []
    for score, post_id in top:
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        results.append({
            "id": post.id,
            "author_id": post.author_id,
            "content": post.content,
            "hashtags": post.hashtags,
            "likes": post.likes,
            "score": round(score, 3),
            "created_at": post.created_at,
        })
    return {"interests_used": interests, "results": results}


@router.post("/users/{username}/follow/{target}", status_code=201)
def follow_user(username: str, target: str):
    if not user_store.exists(username) or not user_store.exists(target):
        raise HTTPException(status_code=404, detail="User not found")
    if username == target:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    user = user_store.get(username)
    target_user = user_store.get(target)

    if target_user.id in user.following:
        raise HTTPException(status_code=409, detail="Already following")

    user.following.append(target_user.id)
    target_user.followers.append(user.id)
    user_store.set(username, user)
    user_store.set(target, target_user)
    social_graph.add_edge(user.id, target_user.id)
    return {"message": f"{username} now follows {target}"}


@router.delete("/users/{username}/follow/{target}", status_code=204)
def unfollow_user(username: str, target: str):
    if not user_store.exists(username) or not user_store.exists(target):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)
    target_user = user_store.get(target)

    if target_user.id not in user.following:
        raise HTTPException(status_code=404, detail="Not following")

    user.following.remove(target_user.id)
    target_user.followers.remove(user.id)
    user_store.set(username, user)
    user_store.set(target, target_user)
    social_graph.remove_edge(user.id, target_user.id)


@router.get("/recommend/people/{username}")
def recommend_people(username: str):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)
    bfs_result = social_graph.bfs_recommend(user.id, depth=2)
    following_ids = set(user.following)
    candidates = {
        uid: cnt for uid, cnt in bfs_result.items()
        if uid != user.id and uid not in following_ids
    }

    sorted_candidates = sorted(candidates.items(), key=lambda x: x[1], reverse=True)[:10]
    id_to_username = {u.id: u.username for u in user_store.values()}

    return [
        {"user_id": uid, "username": id_to_username.get(uid, uid), "common_friends": cnt}
        for uid, cnt in sorted_candidates
    ]


@router.get("/recommend/path/{from_username}/{to_username}")
def recommend_path(from_username: str, to_username: str):
    if not user_store.exists(from_username) or not user_store.exists(to_username):
        raise HTTPException(status_code=404, detail="User not found")

    from_user = user_store.get(from_username)
    to_user = user_store.get(to_username)
    interest_map = _build_interest_map()
    path_ids = social_graph.dijkstra_path(from_user.id, to_user.id, interest_map)

    if not path_ids:
        raise HTTPException(status_code=404, detail="No path found")

    id_to_username = {u.id: u.username for u in user_store.values()}
    path_usernames = [id_to_username.get(uid, uid) for uid in path_ids]
    return {
        "from": from_username,
        "to": to_username,
        "path": path_usernames,
        "hops": len(path_usernames) - 1,
    }
