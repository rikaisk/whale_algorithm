import uuid
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.models import Comment
from core.store import user_store, post_store, comment_store

router = APIRouter(tags=["comments"])


class CommentCreateRequest(BaseModel):
    author_username: str
    content: str


@router.post("/posts/{post_id}/comments")
def create_comment(post_id: str, req: CommentCreateRequest):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    if not user_store.exists(req.author_username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(req.author_username)
    comment_id = str(uuid.uuid4())

    comment = Comment(
        id=comment_id,
        post_id=post_id,
        author_id=user.id,
        content=req.content,
        parent_id=None,
        children=[],
        created_at=time.time(),
    )

    comment_store.set(comment_id, comment)
    post = post_store.get(post_id)
    post.comment_ids.append(comment_id)

    return {"comment_id": comment_id}


@router.post("/comments/{comment_id}/replies")
def create_reply(comment_id: str, req: CommentCreateRequest):
    if not comment_store.exists(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")
    if not user_store.exists(req.author_username):
        raise HTTPException(status_code=404, detail="User not found")

    user = user_store.get(req.author_username)
    parent = comment_store.get(comment_id)
    reply_id = str(uuid.uuid4())

    reply = Comment(
        id=reply_id,
        post_id=parent.post_id,
        author_id=user.id,
        content=req.content,
        parent_id=comment_id,
        children=[],
        created_at=time.time(),
    )

    comment_store.set(reply_id, reply)
    parent.children.append(reply_id)

    return {"comment_id": reply_id}


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: str):
    if not comment_store.exists(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")

    comment = comment_store.get(comment_id)

    # 자식 댓글 재귀 삭제
    _delete_recursive(comment_id)

    # 부모에서 제거
    if comment.parent_id and comment_store.exists(comment.parent_id):
        parent = comment_store.get(comment.parent_id)
        if comment_id in parent.children:
            parent.children.remove(comment_id)
    elif post_store.exists(comment.post_id):
        post = post_store.get(comment.post_id)
        if comment_id in post.comment_ids:
            post.comment_ids.remove(comment_id)

    return {"message": "Comment deleted"}


def _delete_recursive(comment_id: str):
    if not comment_store.exists(comment_id):
        return
    comment = comment_store.get(comment_id)
    for child_id in list(comment.children):
        _delete_recursive(child_id)
    comment_store.delete(comment_id)


@router.get("/posts/{post_id}/comments")
def get_comments(post_id: str):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)
    # 루트 댓글만 시간순 정렬
    root_ids = sorted(
        post.comment_ids,
        key=lambda cid: comment_store.get(cid).created_at if comment_store.exists(cid) else 0,
    )

    return [_build_comment_tree(cid) for cid in root_ids if comment_store.exists(cid)]


def _build_comment_tree(comment_id: str) -> dict:
    """DFS로 댓글 트리 구성"""
    comment = comment_store.get(comment_id)
    author_username = ""
    for u in user_store.values():
        if u.id == comment.author_id:
            author_username = u.username
            break

    sorted_children = sorted(
        comment.children,
        key=lambda cid: comment_store.get(cid).created_at if comment_store.exists(cid) else 0,
    )

    return {
        "id": comment.id,
        "author_username": author_username,
        "content": comment.content,
        "created_at": comment.created_at,
        "replies": [_build_comment_tree(child_id) for child_id in sorted_children if comment_store.exists(child_id)],
    }
