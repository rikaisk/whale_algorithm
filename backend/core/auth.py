import hashlib
import secrets
from fastapi import Header, HTTPException

from core.store import user_store

# token -> user_id 매핑
token_store: dict[str, str] = {}

_PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITERATIONS
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, expected = password_hash.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITERATIONS
    ).hex()
    return secrets.compare_digest(digest, expected)


def create_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    token_store[token] = user_id
    return token


def revoke_token(token: str) -> None:
    token_store.pop(token, None)


def get_current_user(authorization: str = Header(default="")) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization[len("Bearer "):].strip()
    user_id = token_store.get(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


def get_current_username(user_id: str) -> str:
    for user in user_store.values():
        if user.id == user_id:
            return user.username
    raise HTTPException(status_code=401, detail="User no longer exists")
