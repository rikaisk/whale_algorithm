from fastapi import APIRouter
from pydantic import BaseModel

from core.store import user_store
import core.solar as solar

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class AskRequest(BaseModel):
    question: str


def _build_context() -> str:
    ai_users = [u for u in user_store.values() if getattr(u, "is_ai", False)]
    lines = [
        "WhaleGram은 알고리즘 수업 과제로 만들어진 SNS입니다.",
        "직접 구현한 자료구조(HashTable, BST, Trie, KMP, Max-Heap, Graph)와 Upstage Solar LLM API를 결합한 게 핵심입니다.",
        "주요 기능: 피드, 검색(Trie/KMP), AI 추천(Heap+BFS+Dijkstra), 댓글 트리(DFS), DM(WebSocket), 좋아요 토글, 프로필 사진, 팔로워/팔로잉.",
        "",
        "현재 AI 더미 유저들:",
    ]
    for u in ai_users:
        lines.append(f"- {u.username}: {u.bio}")
    return "\n".join(lines)


@router.post("/ask")
async def ask(req: AskRequest):
    question = (req.question or "").strip()
    if not question:
        return {"answer": "질문을 입력해주세요."}
    context = _build_context()
    answer = await solar.chatbot_answer(question, context)
    return {"answer": answer}
