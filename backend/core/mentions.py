import re

from core.store import user_store

# @유저명 (영문/숫자/밑줄/한글 등 단어문자 2~20자)
_MENTION_RE = re.compile(r"@(\w{2,20})", re.UNICODE)


def extract_mentions(content: str) -> list[str]:
    """본문에서 @로 멘션된, 존재하는 '비AI' 실제 유저명 목록(중복 제거)."""
    out: list[str] = []
    for name in _MENTION_RE.findall(content or ""):
        if name in out:
            continue
        if user_store.exists(name):
            u = user_store.get(name)
            if not getattr(u, "is_ai", False):
                out.append(name)
    return out
