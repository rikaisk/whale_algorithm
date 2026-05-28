from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import time

from core.store import post_store, user_store, feed_tree, tag_index
from core.models import Post
import core.solar as solar

router = APIRouter(tags=["posts"])


class CreatePostRequest(BaseModel):
    author_username: str
    content: str


@router.post("/posts", status_code=201)
async def create_post(req: CreatePostRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if not user_store.exists(req.author_username):
        raise HTTPException(status_code=404, detail="User not found")

    author = user_store.get(req.author_username)
    hashtags = await solar.extract_hashtags(req.content)
    post = Post(
        id=str(uuid.uuid4()),
        author_id=author.id,
        content=req.content,
        hashtags=hashtags,
        likes=0,
        comment_ids=[],
        created_at=time.time(),
    )
    post_store.set(post.id, post)
    feed_tree.insert((post.created_at, post.id))
    author.post_ids.append(post.id)
    user_store.set(req.author_username, author)

    for tag in hashtags:
        tag_index.setdefault(tag, set()).add(post.id)

    return {"id": post.id, "hashtags": hashtags, "created_at": post.created_at}


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: str):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)
    feed_tree.delete((post.created_at, post.id))

    for tag in post.hashtags:
        if tag in tag_index:
            tag_index[tag].discard(post.id)

    # author의 post_ids에서 제거
    for user in user_store.values():
        if post_id in user.post_ids:
            user.post_ids.remove(post_id)
            user_store.set(user.username, user)
            break

    post_store.delete(post_id)


@router.post("/posts/{post_id}/like")
def like_post(post_id: str):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)
    post.likes += 1
    post_store.set(post_id, post)
    return {"post_id": post_id, "likes": post.likes}


@router.get("/feed/{username}")
def get_feed(username: str):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)
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
