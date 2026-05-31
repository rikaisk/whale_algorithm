import httpx
import os
import json

SOLAR_API_KEY = os.getenv("SOLAR_API_KEY")
BASE_URL = "https://api.upstage.ai/v1/solar"


async def chat(prompt: str) -> str:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {SOLAR_API_KEY}"},
            json={
                "model": "solar-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            },
            timeout=15.0
        )
        return res.json()["choices"][0]["message"]["content"]


async def extract_interests(bio: str) -> list[str]:
    try:
        result = await chat(
            f"다음 소개글에서 관심사 키워드를 최대 5개 추출해. JSON 배열로만 답해.\n소개글: {bio}"
        )
        return json.loads(result)
    except Exception:
        return []


async def extract_hashtags(content: str) -> list[str]:
    try:
        result = await chat(
            f"다음 게시글에서 해시태그를 정확히 3개 추출해. # 없이 JSON 배열로만 답해.\n내용: {content}"
        )
        return json.loads(result)
    except Exception:
        return []


async def expand_keywords(keyword: str) -> list[str]:
    try:
        result = await chat(
            f"'{keyword}'와 관련된 검색 키워드를 5개 추천해. JSON 배열로만 답해."
        )
        return json.loads(result)
    except Exception:
        return []


async def analyze_interests(bio: str, posts_sample: str) -> list[str]:
    try:
        result = await chat(
            f"사용자의 소개글과 최근 게시글을 분석해서 관심사 키워드를 최대 7개 추출해. JSON 배열로만 답해.\n소개글: {bio}\n최근 게시글: {posts_sample}"
        )
        return json.loads(result)
    except Exception:
        return []


async def persona_reply(persona_name: str, persona_bio: str, user_message: str) -> str:
    try:
        prompt = (
            f"너는 SNS 사용자 '{persona_name}' 야. 자기소개: '{persona_bio}'. "
            f"이 사람의 말투와 관심사를 반영해서 친근하게 1-2문장으로 한국어로 답해줘. "
            f"메시지가 너무 길지 않게.\n"
            f"상대 메시지: {user_message}"
        )
        return await chat(prompt, temperature=0.7)
    except Exception:
        return "지금은 답변할 수 없어요 ㅠㅠ"


async def generate_persona() -> dict:
    try:
        result = await chat(
            "SNS에 가입할 가상의 한국인 캐릭터 1명을 JSON으로 만들어줘. "
            "필드: username (영문 소문자/숫자, 4-10자), bio (자기소개 한 문장, 한국어), "
            "post_count (3-7 사이 정수). JSON만 답해, 다른 텍스트 없이.",
            temperature=0.9,
        )
        return json.loads(result)
    except Exception:
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
    except Exception:
        return ""
