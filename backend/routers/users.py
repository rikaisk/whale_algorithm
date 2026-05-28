import uuid
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.models import User
from core.store import user_store, search_trie, social_graph
from core.solar import extract_interests

router = APIRouter(prefix="/users", tags=["users"])


class RegisterRequest(BaseModel):
    username: str
    bio: str


class BioUpdateRequest(BaseModel):
    bio: str


@router.post("/register")
async def register(req: RegisterRequest):
    if user_store.exists(req.username):
        raise HTTPException(status_code=400, detail="Username already exists")

    user_id = str(uuid.uuid4())
    interests = await extract_interests(req.bio)

    user = User(
        id=user_id,
        username=req.username,
        bio=req.bio,
        interests=interests,
        following=[],
        followers=[],
        post_ids=[],
        created_at=time.time(),
    )

    user_store.set(req.username, user)
    search_trie.insert(req.username)
    social_graph.add_node(user_id)

    return {"user_id": user_id, "username": req.username, "interests": interests}


@router.get("/{username}")
def get_user(username: str):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")
    user = user_store.get(username)
    return {
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "interests": user.interests,
        "following": user.following,
        "followers": user.followers,
        "post_ids": user.post_ids,
        "created_at": user.created_at,
    }


@router.patch("/{username}/bio")
async def update_bio(username: str, req: BioUpdateRequest):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")
    user = user_store.get(username)
    user.bio = req.bio
    user.interests = await extract_interests(req.bio)
    user_store.set(username, user)
    return {"username": username, "bio": user.bio, "interests": user.interests}


@router.get("/{username}/friends")
def get_friends(username: str):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")
    user = user_store.get(username)

    following = []
    for uid in user.following:
        for u in user_store.values():
            if u.id == uid:
                following.append({"user_id": u.id, "username": u.username, "bio": u.bio})
                break

    followers = []
    for uid in user.followers:
        for u in user_store.values():
            if u.id == uid:
                followers.append({"user_id": u.id, "username": u.username, "bio": u.bio})
                break

    return {"following": following, "followers": followers}


@router.post("/{username}/follow/{target}")
def follow_user(username: str, target: str):
    if not user_store.exists(username) or not user_store.exists(target):
        raise HTTPException(status_code=404, detail="User not found")
    if username == target:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    user = user_store.get(username)
    target_user = user_store.get(target)

    if target_user.id in user.following:
        raise HTTPException(status_code=400, detail="Already following")

    user.following.append(target_user.id)
    target_user.followers.append(user.id)
    social_graph.add_edge(user.id, target_user.id)

    return {"message": f"{username} now follows {target}"}


@router.delete("/{username}/follow/{target}")
def unfollow_user(username: str, target: str):
    if not user_store.exists(username) or not user_store.exists(target):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)
    target_user = user_store.get(target)

    if target_user.id not in user.following:
        raise HTTPException(status_code=400, detail="Not following")

    user.following.remove(target_user.id)
    target_user.followers.remove(user.id)
    social_graph.remove_edge(user.id, target_user.id)

    return {"message": f"{username} unfollowed {target}"}
