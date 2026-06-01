from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import uuid
import time

from core.store import comment_store, post_store, user_store
from core.models import Comment
from core import auth
from core.mentions import extract_mentions
from routers.messages import push_notification

router = APIRouter(tags=["comments"])


class CommentRequest(BaseModel):
    content: str


def _username_of(user_id: str) -> str:
    for u in user_store.values():
        if u.id == user_id:
            return u.username
    return "unknown"


async def _notify_interaction(
    target_user_id: str,
    actor_id: str,
    kind: str,
    content: str,
    post_id: str | None,
    comment_id: str | None = None,
) -> None:
    if not target_user_id or target_user_id == actor_id:
        return
    await push_notification(target_user_id, {
        "kind": kind,
        "from_username": _username_of(actor_id),
        "content": content[:120],
        "post_id": post_id,
        "comment_id": comment_id,
        "created_at": time.time(),
    })


async def _notify_mentions(
    content: str,
    actor_id: str,
    post_id: str | None,
    comment_id: str | None = None,
) -> None:
    for name in extract_mentions(content):
        if not user_store.exists(name):
            continue
        target = user_store.get(name)
        await _notify_interaction(target.id, actor_id, "mention", content, post_id, comment_id)


def _get_comment_tree(comment_id: str, id_to_name: dict[str, str], current_user_id: str | None = None) -> dict | None:
    if not comment_store.exists(comment_id):
        return None
    comment = comment_store.get(comment_id)
    sorted_children = sorted(
        comment.children,
        key=lambda cid: comment_store.get(cid).created_at if comment_store.exists(cid) else 0,
    )
    replies = [
        r for cid in sorted_children
        if (r := _get_comment_tree(cid, id_to_name, current_user_id)) is not None
    ]
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "author_id": comment.author_id,
        "author_username": id_to_name.get(comment.author_id, "unknown"),
        "content": comment.content,
        "parent_id": comment.parent_id,
        "created_at": comment.created_at,
        "likes": comment.likes,
        "liked_by_me": bool(current_user_id and current_user_id in comment.liked_by),
        "replies": replies,
    }


def _delete_subtree(comment_id: str) -> None:
    if not comment_store.exists(comment_id):
        return
    comment = comment_store.get(comment_id)
    for child_id in list(comment.children):
        _delete_subtree(child_id)
    comment_store.delete(comment_id)


@router.post("/posts/{post_id}/comments", status_code=201)
async def create_comment(
    post_id: str,
    req: CommentRequest,
    user_id: str = Depends(auth.get_current_user),
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)
    comment = Comment(
        id=str(uuid.uuid4()),
        post_id=post_id,
        author_id=user_id,
        content=req.content,
        parent_id=None,
        children=[],
        created_at=time.time(),
    )
    comment_store.set(comment.id, comment)
    post.comment_ids.append(comment.id)
    post_store.set(post_id, post)

    # 게시물 작성자에게 댓글 알림 + 멘션 알림 (근원지=이 댓글)
    await _notify_interaction(post.author_id, user_id, "comment", req.content, post_id, comment.id)
    await _notify_mentions(req.content, user_id, post_id, comment.id)
    return {"id": comment.id, "created_at": comment.created_at}


@router.post("/comments/{comment_id}/replies", status_code=201)
async def create_reply(
    comment_id: str,
    req: CommentRequest,
    user_id: str = Depends(auth.get_current_user),
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if not comment_store.exists(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")

    parent = comment_store.get(comment_id)
    reply = Comment(
        id=str(uuid.uuid4()),
        post_id=parent.post_id,
        author_id=user_id,
        content=req.content,
        parent_id=comment_id,
        children=[],
        created_at=time.time(),
    )
    comment_store.set(reply.id, reply)
    parent.children.append(reply.id)
    comment_store.set(comment_id, parent)

    # 부모 댓글 작성자에게 답글 알림 + 멘션 알림 (근원지=이 답글)
    await _notify_interaction(parent.author_id, user_id, "reply", req.content, parent.post_id, reply.id)
    await _notify_mentions(req.content, user_id, parent.post_id, reply.id)
    return {"id": reply.id, "parent_id": comment_id, "created_at": reply.created_at}


@router.post("/comments/{comment_id}/like")
def like_comment(
    comment_id: str,
    user_id: str = Depends(auth.get_current_user),
):
    if not comment_store.exists(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")
    comment = comment_store.get(comment_id)
    if user_id in comment.liked_by:
        comment.liked_by.remove(user_id)
        comment.likes = max(0, comment.likes - 1)
        liked = False
    else:
        comment.liked_by.append(user_id)
        comment.likes += 1
        liked = True
    comment_store.set(comment_id, comment)
    return {"comment_id": comment_id, "likes": comment.likes, "liked_by_me": liked}


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: str,
    user_id: str = Depends(auth.get_current_user),
):
    if not comment_store.exists(comment_id):
        raise HTTPException(status_code=404, detail="Comment not found")

    comment = comment_store.get(comment_id)
    if comment.author_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's comment")

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

    _delete_subtree(comment_id)


@router.get("/posts/{post_id}/comments")
def get_comments(
    post_id: str,
    current_user_id: str | None = Depends(auth.get_current_user_optional),
):
    if not post_store.exists(post_id):
        raise HTTPException(status_code=404, detail="Post not found")

    post = post_store.get(post_id)
    sorted_root_ids = sorted(
        post.comment_ids,
        key=lambda cid: comment_store.get(cid).created_at if comment_store.exists(cid) else 0,
    )
    id_to_name = {u.id: u.username for u in user_store.values()}
    return [
        t for cid in sorted_root_ids
        if (t := _get_comment_tree(cid, id_to_name, current_user_id)) is not None
    ]
