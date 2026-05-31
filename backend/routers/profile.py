from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import uuid
import time

from core.store import user_store, search_trie, social_graph, post_store
from core.models import User
from core import auth
import core.solar as solar

router = APIRouter(prefix="/users", tags=["profile"])


class RegisterRequest(BaseModel):
    username: str
    password: str
    bio: str


class BioUpdateRequest(BaseModel):
    bio: str


def _get_user(username: str):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")
    return user_store.get(username)


@router.post("/register", status_code=201)
async def register(req: RegisterRequest):
    if not req.username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    if user_store.exists(req.username):
        raise HTTPException(status_code=409, detail="Username already exists")

    interests = await solar.extract_interests(req.bio)
    user = User(
        id=str(uuid.uuid4()),
        username=req.username,
        password_hash=auth.hash_password(req.password),
        bio=req.bio,
        interests=interests,
        following=[],
        followers=[],
        post_ids=[],
        created_at=time.time(),
    )
    user_store.set(req.username, user)
    search_trie.insert(req.username, req.username)
    social_graph.add_node(user.id)
    return {"id": user.id, "username": user.username, "interests": user.interests}


@router.get("/{username}")
def get_profile(username: str):
    user = _get_user(username)
    return {
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "interests": user.interests,
        "following_count": len(user.following),
        "followers_count": len(user.followers),
        "post_count": len(user.post_ids),
        "created_at": user.created_at,
    }


@router.get("/{username}/posts")
def get_user_posts(username: str):
    user = _get_user(username)
    posts = []
    for post_id in reversed(user.post_ids):
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        posts.append({
            "id": post.id,
            "author_id": post.author_id,
            "author_username": user.username,
            "content": post.content,
            "hashtags": post.hashtags,
            "likes": post.likes,
            "comment_count": len(post.comment_ids),
            "image_base64": post.image_base64,
            "created_at": post.created_at,
        })
    return posts


@router.patch("/{username}/bio")
async def update_bio(
    username: str,
    req: BioUpdateRequest,
    user_id: str = Depends(auth.get_current_user),
):
    user = _get_user(username)
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot modify another user's bio")
    user.bio = req.bio
    user.interests = await solar.extract_interests(req.bio)
    user_store.set(username, user)
    return {"username": username, "bio": user.bio, "interests": user.interests}
