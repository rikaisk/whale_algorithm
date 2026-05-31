from fastapi import APIRouter, Depends, HTTPException
import time
import random

from core.store import user_store, post_store, tag_index, social_graph
from algorithms.heap import MaxHeap
from core import auth
import core.solar as solar

router = APIRouter(tags=["recommend"])


def _build_interest_map() -> dict[str, list[str]]:
    return {u.id: u.interests for u in user_store.values()}


def _id_to_username() -> dict[str, str]:
    return {u.id: u.username for u in user_store.values()}


def _serialize_post(post, id_to_name, current_user_id, extra=None):
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


@router.get("/recommend/posts/{username}")
def recommend_posts(
    username: str,
    current_user_id: str | None = Depends(auth.get_current_user_optional),
):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")

    from routers.admin import personas_for_interests

    user = user_store.get(username)
    id_to_name = _id_to_username()
    own = set(user.post_ids)
    sections: list[dict] = []
    used_ids: set[str] = set()

    def collect(author_usernames: list[str], limit: int) -> list[dict]:
        author_ids = {
            user_store.get(n).id for n in author_usernames if user_store.exists(n)
        }
        posts = []
        for p in post_store.values():
            if p.id in own or p.id in used_ids:
                continue
            if p.author_id in author_ids:
                posts.append(p)
        posts.sort(key=lambda p: p.created_at, reverse=True)
        chosen = posts[:limit]
        for p in chosen:
            used_ids.add(p.id)
        return [_serialize_post(p, id_to_name, current_user_id) for p in chosen]

    if user.interests:
        # 선택한 관심 분야와 정체성이 맞는 AI 유저들의 게시물
        persona_names = personas_for_interests(user.interests)
        interest_posts = collect(persona_names, 30)
        if interest_posts:
            sections.append({
                "reason": "interest",
                "title": "관심 있을 수도 있는 게시물",
                "posts": interest_posts,
            })
    else:
        # 관심 분야를 건너뛴 경우: 무작위 AI 게시물 추천
        ai_names = [u.username for u in user_store.values() if getattr(u, "is_ai", False)]
        random.shuffle(ai_names)
        random_posts = collect(ai_names, 30)
        if random_posts:
            sections.append({
                "reason": "random",
                "title": "추천 게시물",
                "posts": random_posts,
            })

    # 그 외 둘러볼 만한 다른 AI 게시물 (남는 공간 채우기)
    other_names = [
        u.username for u in user_store.values()
        if getattr(u, "is_ai", False)
    ]
    other_posts = collect(other_names, 15)
    if other_posts:
        sections.append({
            "reason": "explore",
            "title": "둘러보기",
            "posts": other_posts,
        })

    return {"interests": user.interests, "sections": sections}


@router.post("/users/{username}/follow/{target}", status_code=201)
def follow_user(
    username: str,
    target: str,
    user_id: str = Depends(auth.get_current_user),
):
    if not user_store.exists(username) or not user_store.exists(target):
        raise HTTPException(status_code=404, detail="User not found")
    if username == target:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    user = user_store.get(username)
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot act on behalf of another user")
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
def unfollow_user(
    username: str,
    target: str,
    user_id: str = Depends(auth.get_current_user),
):
    if not user_store.exists(username) or not user_store.exists(target):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot act on behalf of another user")
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

    from routers.admin import personas_for_interests

    user = user_store.get(username)
    following_ids = set(user.following)
    id_to_user = {u.id: u for u in user_store.values()}
    seen: set[str] = {user.id}

    def person(u, extra=None):
        item = {
            "user_id": u.id,
            "username": u.username,
            "is_ai": getattr(u, "is_ai", False),
            "bio": u.bio,
        }
        if extra:
            item.update(extra)
        return item

    def take(users, extra_fn=None):
        out = []
        for u in users:
            if u.id in seen or u.id in following_ids:
                continue
            seen.add(u.id)
            out.append(person(u, extra_fn(u) if extra_fn else None))
        return out

    sections: list[dict] = []

    # 1) 최근 가입한 실제 유저 (추천 친구 최상단)
    real_users = [
        u for u in user_store.values()
        if not getattr(u, "is_ai", False) and u.id != user.id and u.id not in following_ids
    ]
    real_users.sort(key=lambda u: getattr(u, "created_at", 0.0), reverse=True)
    recent_real = take(real_users[:10])

    if user.interests:
        # 실제 유저는 '추천 친구'로 최상단에, AI는 관심사 기반 섹션으로
        if recent_real:
            sections.append({"reason": "recent", "title": "추천 친구", "people": recent_real})
        persona_names = personas_for_interests(user.interests)
        interest_ai = [user_store.get(n) for n in persona_names if user_store.exists(n)]
        interest_people = take(interest_ai)
        if interest_people:
            sections.append({
                "reason": "interest",
                "title": "관심사가 비슷한 유저",
                "people": interest_people,
            })
    else:
        # 관심 분야를 건너뛴 경우: 실제 유저 + 무작위 AI 더미 유저 모두 '추천 친구'로
        ai_users = [u for u in user_store.values() if getattr(u, "is_ai", False)]
        random.shuffle(ai_users)
        random_people = take(ai_users)
        people = recent_real + random_people
        if people:
            sections.append({"reason": "random", "title": "추천 친구", "people": people})

    # 2) 공통 친구 기반 (회원님이 알 수도 있는 사람)
    bfs_result = social_graph.bfs_recommend(user.id, depth=2)
    common_sorted = sorted(bfs_result.items(), key=lambda x: x[1], reverse=True)
    common_users = []
    common_count: dict[str, int] = {}
    for uid, cnt in common_sorted:
        u = id_to_user.get(uid)
        if u is None:
            continue
        common_count[uid] = cnt
        common_users.append(u)
    common_people = take(common_users, lambda u: {"common_friends": common_count.get(u.id, 0)})
    if common_people:
        sections.append({
            "reason": "common",
            "title": "회원님이 알 수도 있는 사람",
            "people": common_people,
        })

    return {"sections": sections}


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


@router.get("/recommend/closest/{username}")
def recommend_closest(username: str):
    """Dijkstra 기반 '가까운 친구 찾기'.

    팔로우 그래프 위에서 간선 가중치를 1/(공통 관심사+1)로 두고
    나로부터의 가중 최단거리를 계산한다. 거리가 짧을수록 (사회적으로 가깝고
    관심사도 겹칠수록) 더 추천할 만한 사람이다. 아직 팔로우하지 않은 사람만
    거리순으로 정렬해 연결 경로와 함께 돌려준다.
    """
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)
    interest_map = _build_interest_map()
    reach = social_graph.dijkstra_all(user.id, interest_map)

    following_ids = set(user.following)
    id_to_user = {u.id: u for u in user_store.values()}
    my_interests = set(user.interests)

    candidates = []
    for uid, info in reach.items():
        if uid in following_ids:
            continue
        u = id_to_user.get(uid)
        if u is None:
            continue
        shared = sorted(my_interests & set(u.interests))
        path_names = [
            id_to_user[p].username for p in info["path"] if p in id_to_user
        ]
        candidates.append({
            "user_id": uid,
            "username": u.username,
            "is_ai": getattr(u, "is_ai", False),
            "bio": u.bio,
            "distance": round(info["dist"], 3),
            "hops": max(0, len(info["path"]) - 1),
            "path": path_names,
            "shared_interests": shared,
        })

    candidates.sort(key=lambda c: (c["distance"], c["hops"]))
    return {"results": candidates[:15]}
