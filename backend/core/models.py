from dataclasses import dataclass, field
from typing import Optional


@dataclass
class User:
    id: str                        # UUID
    username: str
    bio: str
    interests: list[str]           # Solar가 추출한 관심사 태그
    following: list[str]           # 팔로우하는 user_id 목록
    followers: list[str]           # 팔로워 user_id 목록
    post_ids: list[str] = field(default_factory=list)
    created_at: float = 0.0        # UNIX timestamp


@dataclass
class Post:
    id: str                        # UUID
    author_id: str
    content: str
    hashtags: list[str]            # Solar가 추출한 해시태그
    likes: int = 0
    comment_ids: list[str] = field(default_factory=list)
    created_at: float = 0.0


@dataclass
class Comment:
    id: str                        # UUID
    post_id: str
    author_id: str
    content: str
    parent_id: Optional[str] = None       # None이면 루트 댓글
    children: list[str] = field(default_factory=list)
    created_at: float = 0.0
