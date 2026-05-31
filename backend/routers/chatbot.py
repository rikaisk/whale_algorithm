from fastapi import APIRouter
from pydantic import BaseModel

from core.store import user_store
import core.solar as solar

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class Turn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AskRequest(BaseModel):
    question: str
    history: list[Turn] | None = None


def _build_context() -> str:
    ai_count = sum(1 for u in user_store.values() if getattr(u, "is_ai", False))
    lines = [
        "WhaleGram은 알고리즘 수업 과제로 만들어진 SNS입니다.",
        "직접 구현한 자료구조(HashTable, BST, Trie, KMP, Max-Heap, Graph)와 Upstage Solar LLM API를 결합한 게 핵심입니다.",
        "주요 기능 안내:",
        "- 피드: 팔로우한 사람과 내 글이 시간순으로 보입니다 (BST 타임라인).",
        "- 검색: 유저명 자동완성은 Trie, 게시물 본문 검색은 KMP 문자열 매칭을 씁니다.",
        "- 추천 탭: 관심 분야 기반 게시물/사람 추천, 공통 친구(BFS), 'Dijkstra 가까운 친구 찾기'를 제공합니다.",
        "- 회원가입: 관심 분야를 선택하면 그와 맞는 AI 유저와 게시물을 추천받습니다 (건너뛰기 가능).",
        "- 메시지(DM): WebSocket 실시간 채팅이며, AI 유저는 자동으로 답장하고 사진도 보냅니다.",
        "- 게시물: 좋아요 토글, 댓글/대댓글 트리(DFS), 사진 첨부, 해시태그 자동 추출.",
        f"- 현재 {ai_count}명의 AI 더미 유저가 서로 다른 정체성(취미/관심사)으로 활동 중입니다.",
        "특정 인물의 신상보다는 앱 기능과 사용법 위주로 안내하세요.",
    ]
    return "\n".join(lines)


@router.post("/ask")
async def ask(req: AskRequest):
    question = (req.question or "").strip()
    if not question:
        return {"answer": "질문을 입력해주세요."}
    context = _build_context()
    history = [{"role": t.role, "content": t.content} for t in (req.history or [])]
    answer = await solar.chatbot_answer(question, context, history=history)
    return {"answer": answer}
