from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import time

from core.store import comment_store, post_store
from core.models import Comment

router = APIRouter(tags=["comments"])


class CommentRequest(BaseModel):
    author_id: str
    content: str


def _get_comment_tree(comment_id: str) -> dict | None:
    if not comment_store.exists(comment_id):
        return None
    comment = comment_store.get(comment_id)
    sorted_children = sorted(
        comment.children,
        key=lambda cid: comment_store.get(cid).created_at if comment_store.exists(cid) else 0,
    )
    replies = [r for cid in sorted_children if (r := _get_comment_tree(cid)) is not None]
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "author_id": comment.author_id,
        "content": comment.content,
        "parent_id": comment.parent_id,
        "created_at": comment.created_at,
        "replies": replies,
    }


@router.post("/posts/{post_id}/comments", status_code=201)
def create_comment(post_id: str, req: CommentRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)
    comment = Comment(
        id=str(uuid.uuid4()),
        post_id=post_id,
        author_id=req.author_id,
        content=req.content,
        parent_id=None,
        children=[],
        created_at=time.time(),
    )
    comment_store.set(comment.id, comment)
    post.comment_ids.append(comment.id)
    post_store.set(post_id, post)
    return {"id": comment.id, "created_at": comment.created_at}


@router.post("/comments/{comment_id}/replies", status_code=201)
def create_reply(comment_id: str, req: CommentRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if not comment_store.exists(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")

    parent = comment_store.get(comment_id)
    reply = Comment(
        id=str(uuid.uuid4()),
        post_id=parent.post_id,
        author_id=req.author_id,
        content=req.content,
        parent_id=comment_id,
        children=[],
        created_at=time.time(),
    )
    comment_store.set(reply.id, reply)
    parent.children.append(reply.id)
    comment_store.set(comment_id, parent)
    return {"id": reply.id, "parent_id": comment_id, "created_at": reply.created_at}


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: str):
    if not comment_store.exists(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")

    comment = comment_store.get(comment_id)

    if comment.parent_id and comment_store.exists(comment.parent_id):
        parent = comment_store.get(comment.parent_id)
        if comment_id in parent.children:
            parent.children.remove(comment_id)
            comment_store.set(comment.parent_id, parent)
    elif comment.parent_id is None and post_store.exists(comment.post_id):
        post = post_store.get(comment.post_id)
        if comment_id in post.comment_ids:
            post.comment_ids.remove(comment_id)
            post_store.set(comment.post_id, post)

    comment_store.delete(comment_id)


@router.get("/posts/{post_id}/comments")
def get_comments(post_id: str):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)
    sorted_root_ids = sorted(
        post.comment_ids,
        key=lambda cid: comment_store.get(cid).created_at if comment_store.exists(cid) else 0,
    )
    return [t for cid in sorted_root_ids if (t := _get_comment_tree(cid)) is not None]
