from dataclasses import dataclass, field
from typing import Optional


@dataclass
class User:
    id: str
    username: str
    password_hash: str
    bio: str
    interests: list[str]
    following: list[str]
    followers: list[str]
    post_ids: list[str] = field(default_factory=list)
    avatar_base64: Optional[str] = None
    is_ai: bool = False
    created_at: float = 0.0
    # 클라이언트 대신 서버에 보관하는 개인 데이터
    search_history: list = field(default_factory=list)
    bot_sessions: list = field(default_factory=list)


@dataclass
class Post:
    id: str
    author_id: str
    content: str
    hashtags: list[str]
    likes: int = 0
    comment_ids: list[str] = field(default_factory=list)
    image_base64: Optional[str] = None
    liked_by: list[str] = field(default_factory=list)
    created_at: float = 0.0


@dataclass
class Comment:
    id: str
    post_id: str
    author_id: str
    content: str
    parent_id: Optional[str] = None
    children: list[str] = field(default_factory=list)
    created_at: float = 0.0


@dataclass
class Message:
    id: str
    sender_id: str
    receiver_id: str
    content: str
    image_url: Optional[str] = None
    created_at: float = 0.0
    read: bool = False
