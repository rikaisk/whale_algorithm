from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from core.store import user_store
from core import auth

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


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
    for user in user_store.values():
        if user.id == user_id:
            return {
                "id": user.id,
                "username": user.username,
                "bio": user.bio,
                "interests": user.interests,
                "avatar_base64": user.avatar_base64,
                "following": list(user.following),
            }
    raise HTTPException(status_code=401, detail="User not found")
