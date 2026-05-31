import httpx
import os
import json

SOLAR_API_KEY = os.getenv("SOLAR_API_KEY", "")
BASE_URL = "https://api.upstage.ai/v1/solar"


def is_configured() -> bool:
    return bool(SOLAR_API_KEY and SOLAR_API_KEY.strip())


async def chat(
    prompt: str,
    temperature: float = 0.3,
    system: str | None = None,
    history: list[dict] | None = None,
) -> str:
    if not is_configured():
        raise RuntimeError("SOLAR_API_KEY is not configured")
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    # 이전 대화 맥락 (LLM 세션처럼 이어서 답하기 위함)
    for turn in (history or []):
        role = turn.get("role")
        content = (turn.get("content") or turn.get("text") or "").strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": prompt})
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {SOLAR_API_KEY}"},
            json={
                "model": "solar-mini",
                "messages": messages,
                "temperature": temperature,
            },
            timeout=25.0,
        )
        if res.status_code != 200:
            print(f"[solar] HTTP {res.status_code}: {res.text[:200]}")
            res.raise_for_status()
        data = res.json()
        return data["choices"][0]["message"]["content"]


async def extract_interests(bio: str) -> list[str]:
    try:
        result = await chat(
            f"다음 소개글에서 관심사 키워드를 최대 5개 추출해. JSON 배열로만 답해.\n소개글: {bio}"
        )
        return json.loads(result)
    except Exception as e:
        print(f"[solar.extract_interests] failed: {type(e).__name__}: {e}")
        return []


async def extract_hashtags(content: str) -> list[str]:
    try:
        result = await chat(
            f"다음 게시글에서 해시태그를 정확히 3개 추출해. # 없이 JSON 배열로만 답해.\n내용: {content}"
        )
        return json.loads(result)
    except Exception as e:
        print(f"[solar.extract_hashtags] failed: {type(e).__name__}: {e}")
        return []


async def expand_keywords(keyword: str) -> list[str]:
    try:
        result = await chat(
            f"'{keyword}'와 관련된 검색 키워드를 5개 추천해. JSON 배열로만 답해."
        )
        return json.loads(result)
    except Exception as e:
        print(f"[solar.expand_keywords] failed: {type(e).__name__}: {e}")
        return []


async def analyze_interests(bio: str, posts_sample: str) -> list[str]:
    try:
        result = await chat(
            f"사용자의 소개글과 최근 게시글을 분석해서 관심사 키워드를 최대 7개 추출해. JSON 배열로만 답해.\n소개글: {bio}\n최근 게시글: {posts_sample}"
        )
        return json.loads(result)
    except Exception as e:
        print(f"[solar.analyze_interests] failed: {type(e).__name__}: {e}")
        return []


async def persona_reply(
    persona_name: str,
    persona_bio: str,
    user_message: str,
    personality_traits: str | None = None,
) -> str:
    if not is_configured():
        return "(Solar API 키 미설정 — 관리자 안내 필요)"
    try:
        system = (
            f"너는 SNS 'WhaleGram'의 사용자 '{persona_name}'야. "
            f"자기소개: {persona_bio}. "
            f"{('성격/특징: ' + personality_traits + '. ') if personality_traits else ''}"
            f"위 정체성에 100% 맞춰서 친근하고 자연스럽게 1-2문장으로 한국어로 답해. "
            f"이모지를 적절히 사용하되 과하지 않게. AI라는 말은 절대 하지 마."
        )
        result = await chat(user_message, temperature=0.85, system=system)
        return result.strip()
    except Exception as e:
        print(f"[solar.persona_reply] {persona_name} failed: {type(e).__name__}: {e}")
        return "(잠시 후 다시 시도해주세요)"


async def generate_persona() -> dict:
    try:
        result = await chat(
            "SNS에 가입할 가상의 한국인 캐릭터 1명을 JSON으로 만들어줘. "
            "필드: username (영문 소문자/숫자, 4-10자), bio (자기소개 한 문장, 한국어), "
            "post_count (3-7 사이 정수). JSON만 답해, 다른 텍스트 없이.",
            temperature=0.9,
        )
        return json.loads(result)
    except Exception as e:
        print(f"[solar.generate_persona] failed: {type(e).__name__}: {e}")
        return {}


async def generate_post_for_persona(persona_name: str, persona_bio: str) -> str:
    try:
        result = await chat(
            f"너는 SNS 사용자 '{persona_name}' 야. 자기소개: '{persona_bio}'. "
            f"이 사람이 SNS에 올릴법한 짧은 게시글(1-3문장, 한국어)을 작성해줘. "
            f"본문만 답해, 따옴표나 다른 설명 없이.",
            temperature=0.85,
        )
        return result.strip().strip('"').strip("'")
    except Exception as e:
        print(f"[solar.generate_post] failed: {type(e).__name__}: {e}")
        return ""


async def chatbot_answer(
    question: str, context: str, history: list[dict] | None = None
) -> str:
    if not is_configured():
        return "Solar API 키가 설정되지 않아 답변할 수 없습니다. 관리자에게 문의해주세요."
    try:
        system = (
            "너는 WhaleGram 가이드 봇이야. 아래 컨텍스트를 바탕으로 앱 사용법과 기능을 안내해. "
            "WhaleGram은 직접 구현한 자료구조와 Solar LLM을 결합한 SNS이고, AI 더미 유저들이 함께 활동해. "
            "이전 대화 맥락이 있으면 자연스럽게 이어서 답해. "
            "친절하고 간결하게 2-4문장으로 한국어로 답하고, 모르는 것은 모른다고 솔직히 말해. "
            "이모지를 적절히 써."
            f"\n=== 컨텍스트 ===\n{context}"
        )
        return await chat(question, temperature=0.5, system=system, history=history)
    except Exception as e:
        print(f"[solar.chatbot] failed: {type(e).__name__}: {e}")
        return "(잠시 후 다시 시도해주세요)"
