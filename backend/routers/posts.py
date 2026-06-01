from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import base64
import uuid
import time

from core.store import (
    post_store, user_store, comment_store, feed_tree, tag_index,
)
from core.models import Post
from core import auth
from core.mentions import extract_mentions
from routers.messages import push_notification
import core.solar as solar

router = APIRouter(tags=["posts"])

MAX_IMAGE_BYTES = 1_000_000


class CreatePostRequest(BaseModel):
    content: str
    image_base64: Optional[str] = None


def _serialize_post(
    post: Post,
    id_to_name: dict[str, str],
    current_user_id: str | None = None,
    id_to_ai: dict[str, bool] | None = None,
) -> dict:
    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_username": id_to_name.get(post.author_id, "unknown"),
        "author_is_ai": bool(id_to_ai and id_to_ai.get(post.author_id)),
        "content": post.content,
        "hashtags": post.hashtags,
        "likes": post.likes,
        "comment_count": len(post.comment_ids),
        "image_base64": post.image_base64,
        "liked_by_me": bool(current_user_id and current_user_id in post.liked_by),
        "created_at": post.created_at,
    }


@router.post("/posts", status_code=201)
async def create_post(
    req: CreatePostRequest,
    user_id: str = Depends(auth.get_current_user),
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    author = None
    for u in user_store.values():
        if u.id == user_id:
            author = u
            break
    if author is None:
        raise HTTPException(status_code=401, detail="User not found")

    if req.image_base64:
        try:
            raw = base64.b64decode(req.image_base64.split(",", 1)[-1], validate=True)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image")
        if len(raw) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image exceeds 1MB limit")

    hashtags = await solar.extract_hashtags(req.content)
    post = Post(
        id=str(uuid.uuid4()),
        author_id=author.id,
        content=req.content,
        hashtags=hashtags,
        likes=0,
        comment_ids=[],
        image_base64=req.image_base64,
        liked_by=[],
        created_at=time.time(),
    )
    post_store.set(post.id, post)
    feed_tree.insert((post.created_at, post.id))
    author.post_ids.append(post.id)
    user_store.set(author.username, author)

    for tag in hashtags:
        tag_index.setdefault(tag, set()).add(post.id)

    # @멘션된 실제 유저에게 알림
    for name in extract_mentions(req.content):
        if user_store.exists(name):
            target = user_store.get(name)
            if target.id != author.id:
                await push_notification(target.id, {
                    "kind": "mention",
                    "from_username": author.username,
                    "content": req.content[:120],
                    "post_id": post.id,
                    "comment_id": None,
                    "created_at": time.time(),
                })

    return {"id": post.id, "hashtags": hashtags, "created_at": post.created_at}


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(
    post_id: str,
    user_id: str = Depends(auth.get_current_user),
):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)
    if post.author_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's post")

    feed_tree.delete((post.created_at, post.id))

    for tag in post.hashtags:
        if tag in tag_index:
            tag_index[tag].discard(post.id)
            if not tag_index[tag]:
                del tag_index[tag]

    for comment_id in list(post.comment_ids):
        _delete_comment_subtree(comment_id)

    for user in user_store.values():
        if post_id in user.post_ids:
            user.post_ids.remove(post_id)
            user_store.set(user.username, user)
            break

    post_store.delete(post_id)


def _delete_comment_subtree(comment_id: str) -> None:
    if not comment_store.exists(comment_id):
        return
    comment = comment_store.get(comment_id)
    for child_id in list(comment.children):
        _delete_comment_subtree(child_id)
    comment_store.delete(comment_id)


@router.post("/posts/{post_id}/like")
def like_post(
    post_id: str,
    user_id: str = Depends(auth.get_current_user),
):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)
    if user_id in post.liked_by:
        post.liked_by.remove(user_id)
        post.likes = max(0, post.likes - 1)
        liked = False
    else:
        post.liked_by.append(user_id)
        post.likes += 1
        liked = True
    post_store.set(post_id, post)
    return {"post_id": post_id, "likes": post.likes, "liked_by_me": liked}


@router.get("/posts/{post_id}")
def get_post(
    post_id: str,
    current_user_id: str | None = Depends(auth.get_current_user_optional),
):
    """단일 게시물 조회 (알림 클릭 → 근원지 이동에 사용)."""
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    post = post_store.get(post_id)
    id_to_name = {u.id: u.username for u in user_store.values()}
    id_to_ai = {u.id: u.is_ai for u in user_store.values()}
    return _serialize_post(post, id_to_name, current_user_id, id_to_ai)


@router.get("/posts/{post_id}/likers")
def get_likers(post_id: str):
    """게시물에 좋아요를 누른 유저 목록."""
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    post = post_store.get(post_id)
    id_to_user = {u.id: u for u in user_store.values()}
    out = []
    for uid in post.liked_by:
        u = id_to_user.get(uid)
        if u:
            out.append({
                "username": u.username,
                "avatar_base64": u.avatar_base64,
                "is_ai": u.is_ai,
                "bio": u.bio,
            })
    return out


@router.get("/feed/{username}")
def get_feed(
    username: str,
    current_user_id: str | None = Depends(auth.get_current_user_optional),
):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)
    relevant_author_ids = set(user.following) | {user.id}
    all_posts = feed_tree.inorder()
    id_to_name = {u.id: u.username for u in user_store.values()}
    id_to_ai = {u.id: u.is_ai for u in user_store.values()}

    feed = []
    for _, post_id in reversed(all_posts):
        if not post_store.exists(post_id):
            continue
        post = post_store.get(post_id)
        if post.author_id in relevant_author_ids:
            feed.append(_serialize_post(post, id_to_name, current_user_id, id_to_ai))
    return feed
