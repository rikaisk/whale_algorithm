from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import time

from core.store import user_store, search_trie, social_graph, feed_tree, post_store
from core.models import User
import core.solar as solar

router = APIRouter(prefix="/users", tags=["profile"])


class RegisterRequest(BaseModel):
    username: str
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
    if user_store.exists(req.username):
        raise HTTPException(status_code=409, detail="Username already exists")

    interests = await solar.extract_interests(req.bio)
    user = User(
        id=str(uuid.uuid4()),
        username=req.username,
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


@router.patch("/{username}/bio")
async def update_bio(username: str, req: BioUpdateRequest):
    user = _get_user(username)
    user.bio = req.bio
    user.interests = await solar.extract_interests(req.bio)
    user_store.set(username, user)
    return {"username": username, "bio": user.bio, "interests": user.interests}


@router.get("/{username}/feed")
def get_user_feed(username: str):
    user = _get_user(username)
    following_ids = set(user.following)
    all_posts = feed_tree.inorder()

    feed = []
    for _, post_id in reversed(all_posts):
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        if post.author_id in following_ids:
            feed.append({
                "id": post.id,
                "author_id": post.author_id,
                "content": post.content,
                "hashtags": post.hashtags,
                "likes": post.likes,
                "comment_count": len(post.comment_ids),
                "created_at": post.created_at,
            })
    return feed
