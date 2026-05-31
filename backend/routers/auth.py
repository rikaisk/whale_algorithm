from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Any

from core.store import user_store
from core import auth

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ListBody(BaseModel):
    items: list[Any]


def _user_by_id(user_id: str):
    for user in user_store.values():
        if user.id == user_id:
            return user
    return None


@router.post("/login")
def login(req: LoginRequest):
    if not user_store.exists(req.username):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = user_store.get(req.username)
    if not auth.verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = auth.create_token(user.id)
    return {"token": token, "username": user.username, "id": user.id}


@router.post("/logout", status_code=204)
def logout(authorization: str = Header(default="")):
    if authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):].strip()
        auth.revoke_token(token)


@router.get("/me")
def get_me(user_id: str = Depends(auth.get_current_user)):
    user = _user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "interests": user.interests,
        "avatar_base64": user.avatar_base64,
        "following": list(user.following),
    }


# ---- 개인 데이터(검색 기록 / 가이드봇 대화)를 서버에 보관 ----

@router.get("/me/search_history")
def get_search_history(user_id: str = Depends(auth.get_current_user)):
    user = _user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return {"items": list(getattr(user, "search_history", []) or [])}


@router.put("/me/search_history")
def put_search_history(body: ListBody, user_id: str = Depends(auth.get_current_user)):
    user = _user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    user.search_history = body.items[:50]
    user_store.set(user.username, user)
    return {"items": user.search_history}


@router.get("/me/bot_sessions")
def get_bot_sessions(user_id: str = Depends(auth.get_current_user)):
    user = _user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return {"items": list(getattr(user, "bot_sessions", []) or [])}


@router.put("/me/bot_sessions")
def put_bot_sessions(body: ListBody, user_id: str = Depends(auth.get_current_user)):
    user = _user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    user.bot_sessions = body.items[:50]
    user_store.set(user.username, user)
    return {"items": user.bot_sessions}
