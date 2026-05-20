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
