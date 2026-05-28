import uuid
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.models import Post
from core.store import user_store, post_store, feed_tree, tag_index
from core.solar import extract_hashtags

router = APIRouter(tags=["posts"])


class PostCreateRequest(BaseModel):
    author_username: str
    content: str


@router.post("/posts")
async def create_post(req: PostCreateRequest):
    if not user_store.exists(req.author_username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(req.author_username)
    post_id = str(uuid.uuid4())
    hashtags = await extract_hashtags(req.content)

    post = Post(
        id=post_id,
        author_id=user.id,
        content=req.content,
        hashtags=hashtags,
        likes=0,
        comment_ids=[],
        created_at=time.time(),
    )

    post_store.set(post_id, post)
    feed_tree.insert((post.created_at, post_id))
    user.post_ids.append(post_id)

    for tag in hashtags:
        if tag not in tag_index:
            tag_index[tag] = set()
        tag_index[tag].add(post_id)

    return {
        "post_id": post_id,
        "hashtags": hashtags,
        "created_at": post.created_at,
    }


@router.get("/posts/all")
def get_all_posts():
    all_entries = feed_tree.inorder()
    posts = []
    for timestamp, post_id in reversed(all_entries):
        if post_store.exists(post_id):
            post = post_store.get(post_id)
            author_username = ""
            for u in user_store.values():
                if u.id == post.author_id:
                    author_username = u.username
                    break
            posts.append({
                "id": post.id,
                "author_id": post.author_id,
                "author_username": author_username,
                "content": post.content,
                "hashtags": post.hashtags,
                "likes": post.likes,
                "comment_ids": post.comment_ids,
                "created_at": post.created_at,
            })
    return posts


@router.get("/posts/{post_id}")
def get_post(post_id: str):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    post = post_store.get(post_id)
    # author username 찾기
    author_username = ""
    for u in user_store.values():
        if u.id == post.author_id:
            author_username = u.username
            break
    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_username": author_username,
        "content": post.content,
        "hashtags": post.hashtags,
        "likes": post.likes,
        "comment_ids": post.comment_ids,
        "created_at": post.created_at,
    }


@router.delete("/posts/{post_id}")
def delete_post(post_id: str):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)

    # BST에서 제거
    feed_tree.delete((post.created_at, post_id))

    # tag_index에서 제거
    for tag in post.hashtags:
        if tag in tag_index:
            tag_index[tag].discard(post_id)

    # 유저의 post_ids에서 제거
    for u in user_store.values():
        if u.id == post.author_id:
            if post_id in u.post_ids:
                u.post_ids.remove(post_id)
            break

    post_store.delete(post_id)
    return {"message": "Post deleted"}


@router.post("/posts/{post_id}/like")
def like_post(post_id: str):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    post = post_store.get(post_id)
    post.likes += 1
    return {"post_id": post_id, "likes": post.likes}


@router.get("/feed/{username}")
def get_feed(username: str):
    if not user_store.exists(username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(username)
    following_ids = set(user.following)

    # BST inorder로 시간순 정렬된 모든 포스트 가져오기
    all_entries = feed_tree.inorder()

    feed = []
    for timestamp, post_id in reversed(all_entries):  # 최신순
        if post_store.exists(post_id):
            post = post_store.get(post_id)
            if post.author_id in following_ids:
                author_username = ""
                for u in user_store.values():
                    if u.id == post.author_id:
                        author_username = u.username
                        break
                feed.append({
                    "id": post.id,
                    "author_id": post.author_id,
                    "author_username": author_username,
                    "content": post.content,
                    "hashtags": post.hashtags,
                    "likes": post.likes,
                    "created_at": post.created_at,
                })
    return feed
