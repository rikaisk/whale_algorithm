from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from dataclasses import asdict
import asyncio
import random
import urllib.parse
import uuid
import time
import json

from core.store import user_store, message_store
from core.models import Message
from core import auth, persistence
import core.solar as solar


_IMAGE_REQUEST_KEYWORDS = (
    "사진", "보여줘", "보내줘", "보내봐", "찍어", "보이고", "보내",
    "photo", "pic", "show me", "image", "selfie",
)


def _wants_image(user_message: str) -> bool:
    lower = user_message.lower()
    if any(k in user_message for k in _IMAGE_REQUEST_KEYWORDS):
        return True
    if any(k in lower for k in _IMAGE_REQUEST_KEYWORDS):
        return True
    # 30% random chance otherwise
    return random.random() < 0.3


def _build_pollinations_url(prompt: str) -> str:
    encoded = urllib.parse.quote(prompt)
    seed = random.randint(1, 1_000_000)
    return f"https://image.pollinations.ai/prompt/{encoded}?width=512&height=512&seed={seed}&nologo=true"

router = APIRouter(tags=["messages"])


class SendMessageRequest(BaseModel):
    to_username: str
    content: str


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active[user_id] = websocket

    def disconnect(self, user_id: str) -> None:
        self.active.pop(user_id, None)

    async def send_to(self, user_id: str, payload: dict) -> bool:
        ws = self.active.get(user_id)
        if ws is None:
            return False
        try:
            await ws.send_json(payload)
            return True
        except Exception:
            self.disconnect(user_id)
            return False


manager = ConnectionManager()


def _username_to_id(username: str) -> str | None:
    if not user_store.exists(username):
        return None
    return user_store.get(username).id


def _id_to_username(user_id: str) -> str | None:
    for u in user_store.values():
        if u.id == user_id:
            return u.username
    return None


def _get_user_by_id(user_id: str):
    for u in user_store.values():
        if u.id == user_id:
            return u
    return None


def _persist_message(msg: Message) -> None:
    message_store.set(msg.id, msg)


async def _maybe_ai_reply(sender_id: str, receiver_id: str, incoming_content: str) -> None:
    """If receiver is AI, generate a Solar reply from receiver → sender."""
    receiver = _get_user_by_id(receiver_id)
    if receiver is None or not getattr(receiver, "is_ai", False):
        return

    from routers.admin import get_persona_personality
    personality = get_persona_personality(receiver.username)

    reply_text = await solar.persona_reply(
        receiver.username, receiver.bio, incoming_content, personality_traits=personality
    )
    if not reply_text:
        return

    # Decide if image attached (주제에 맞는 안정적 이미지 — loremflickr)
    image_url = None
    if _wants_image(incoming_content):
        from routers.admin import _persona_image_url
        image_url = _persona_image_url(receiver.username, str(uuid.uuid4()))

    reply = Message(
        id=str(uuid.uuid4()),
        sender_id=receiver_id,
        receiver_id=sender_id,
        content=reply_text,
        image_url=image_url,
        created_at=time.time(),
        read=False,
    )
    _persist_message(reply)
    try:
        persistence.save_all()
    except Exception:
        pass

    payload = {
        "type": "message",
        "id": reply.id,
        "sender_id": receiver_id,
        "sender_username": receiver.username,
        "receiver_id": sender_id,
        "content": reply.content,
        "image_url": image_url,
        "created_at": reply.created_at,
    }
    await manager.send_to(sender_id, payload)


@router.post("/messages", status_code=201)
async def send_message(
    req: SendMessageRequest,
    sender_id: str = Depends(auth.get_current_user),
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    receiver_id = _username_to_id(req.to_username)
    if receiver_id is None:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if receiver_id == sender_id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")

    msg = Message(
        id=str(uuid.uuid4()),
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=req.content,
        created_at=time.time(),
        read=False,
    )
    _persist_message(msg)

    payload = {
        "type": "message",
        "id": msg.id,
        "sender_id": sender_id,
        "sender_username": _id_to_username(sender_id),
        "receiver_id": receiver_id,
        "content": msg.content,
        "created_at": msg.created_at,
    }
    await manager.send_to(receiver_id, payload)

    asyncio.create_task(_maybe_ai_reply(sender_id, receiver_id, req.content))

    return {"id": msg.id, "created_at": msg.created_at}


@router.get("/messages/{peer_username}")
def get_conversation(
    peer_username: str,
    user_id: str = Depends(auth.get_current_user),
):
    peer_id = _username_to_id(peer_username)
    if peer_id is None:
        raise HTTPException(status_code=404, detail="User not found")

    conversation = []
    for msg in message_store.values():
        if (msg.sender_id == user_id and msg.receiver_id == peer_id) or \
           (msg.sender_id == peer_id and msg.receiver_id == user_id):
            conversation.append(asdict(msg))

    conversation.sort(key=lambda m: m["created_at"])
    return conversation


@router.get("/messages")
def list_conversations(user_id: str = Depends(auth.get_current_user)):
    peers: dict[str, dict] = {}
    for msg in message_store.values():
        if msg.sender_id == user_id:
            peer_id = msg.receiver_id
        elif msg.receiver_id == user_id:
            peer_id = msg.sender_id
        else:
            continue
        existing = peers.get(peer_id)
        if existing is None or msg.created_at > existing["last_at"]:
            peers[peer_id] = {
                "peer_id": peer_id,
                "peer_username": _id_to_username(peer_id),
                "last_content": msg.content,
                "last_at": msg.created_at,
            }
    return sorted(peers.values(), key=lambda x: x["last_at"], reverse=True)


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token", "")
    user_id = auth.token_store.get(token)
    if not user_id:
        await websocket.close(code=4401)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            to_username = data.get("to_username")
            content = (data.get("content") or "").strip()
            if not to_username or not content:
                continue

            receiver_id = _username_to_id(to_username)
            if receiver_id is None or receiver_id == user_id:
                continue

            msg = Message(
                id=str(uuid.uuid4()),
                sender_id=user_id,
                receiver_id=receiver_id,
                content=content,
                created_at=time.time(),
                read=False,
            )
            _persist_message(msg)
            try:
                persistence.save_all()
            except Exception:
                pass

            payload = {
                "type": "message",
                "id": msg.id,
                "sender_id": user_id,
                "sender_username": _id_to_username(user_id),
                "receiver_id": receiver_id,
                "content": msg.content,
                "created_at": msg.created_at,
            }
            await manager.send_to(receiver_id, payload)
            await websocket.send_json({**payload, "type": "echo"})

            asyncio.create_task(_maybe_ai_reply(user_id, receiver_id, content))
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id)
