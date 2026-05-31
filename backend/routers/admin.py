from fastapi import APIRouter, HTTPException
import random
import time
import uuid

from core.store import (
    user_store, post_store, feed_tree, tag_index, search_trie, social_graph,
)
from core.models import User, Post
from core import auth
import core.solar as solar

router = APIRouter(prefix="/admin", tags=["admin"])


FALLBACK_PERSONAS = [
    {
        "username": "yuna",
        "bio": "디저트 카페 투어가 취미인 대학생이에요. 신상 베이커리 찾아다녀요 ☕",
    },
    {
        "username": "minho",
        "bio": "주말마다 한강에서 러닝하는 직장인. 마라톤 도전 중!",
    },
    {
        "username": "jisoo",
        "bio": "독립 영화관 단골. 최근엔 일본 영화에 빠졌어요 🎬",
    },
    {
        "username": "taeyang",
        "bio": "백패킹과 캠핑이 인생의 낙. 별 보러 산으로 갑니다 ⛺",
    },
    {
        "username": "haeun",
        "bio": "퀼팅과 자수하는 일러스트레이터. 고양이 두 마리 집사 🐈",
    },
]


FALLBACK_POSTS = {
    "yuna": [
        "성수동 새로 오픈한 베이커리 다녀왔어요. 크루아상 진심 최고",
        "오늘 학교 카페에서 시험 공부. 라떼는 거들 뿐",
        "디저트 투어 with 친구들 🍰",
        "도쿄 가면 가고 싶은 카페 리스트 작성 중",
    ],
    "minho": [
        "오늘 10km 러닝 완주. 무릎이 아우성치네요",
        "마라톤 D-30. 점점 긴장됩니다",
        "한강 야경 보면서 뛰는 거 인생...",
        "러닝화 새로 샀어요. 추천 받습니다",
    ],
    "jisoo": [
        "왕가위 영화 다시 정주행 중. 화양연화 또 보고 또 보고",
        "독립영화관 시즌제 끊었어요. 일주일에 두 편씩 보러 갑니다",
        "고레에다 신작 너무 좋았어요. 가족이라는 게 뭘까",
        "오늘은 단편 영화제. 짧지만 강렬한 작품들",
    ],
    "taeyang": [
        "강원도 별 보러 백패킹. 텐트에서 본 밤하늘 미쳤음",
        "캠핑 장비 정리. 다음 주 또 출발",
        "솔로 캠핑의 매력은 고요함",
        "백패킹 코스 추천 받아요. 1박 2일짜리로",
    ],
    "haeun": [
        "고양이 두 마리가 자수 실타래에 빠짐. 작업 안 됨",
        "퀼팅 패턴 디자인 중. 봄 컬렉션 준비",
        "원데이 클래스 오픈했어요. 자수 입문자 환영",
        "냥이들 사진 보고 갑니다 🐈",
    ],
}


async def _generate_persona_with_solar(used_names: set[str]) -> dict:
    p = await solar.generate_persona()
    if (
        isinstance(p, dict)
        and isinstance(p.get("username"), str)
        and isinstance(p.get("bio"), str)
        and p["username"].lower() not in used_names
        and 3 <= len(p["username"]) <= 16
    ):
        return {"username": p["username"].lower(), "bio": p["bio"]}
    return {}


@router.post("/seed_ai_users")
async def seed_ai_users():
    existing_ai = [u for u in user_store.values() if getattr(u, "is_ai", False)]
    if existing_ai:
        return {
            "message": "AI 유저가 이미 존재합니다. 먼저 /admin/reset_ai_users로 초기화하세요.",
            "existing": [u.username for u in existing_ai],
        }

    used_names = {u.username.lower() for u in user_store.values()}
    personas: list[dict] = []

    for fallback in FALLBACK_PERSONAS:
        generated = await _generate_persona_with_solar(used_names)
        persona = generated if generated else fallback
        if persona["username"].lower() in used_names:
            persona = fallback
        used_names.add(persona["username"].lower())
        personas.append(persona)

    created_users = []
    for persona in personas:
        username = persona["username"]
        bio = persona["bio"]
        interests = await solar.extract_interests(bio)
        user = User(
            id=str(uuid.uuid4()),
            username=username,
            password_hash=auth.hash_password(str(uuid.uuid4())),
            bio=bio,
            interests=interests,
            following=[],
            followers=[],
            post_ids=[],
            avatar_base64=None,
            is_ai=True,
            created_at=time.time(),
        )
        user_store.set(username, user)
        search_trie.insert(username, username)
        social_graph.add_node(user.id)
        created_users.append(user)

    for user in created_users:
        count = random.randint(3, 7)
        for _ in range(count):
            fallback_pool = FALLBACK_POSTS.get(user.username) or [
                f"안녕하세요, {user.username}입니다."
            ]
            content = await solar.generate_post_for_persona(user.username, user.bio)
            if not content:
                content = random.choice(fallback_pool)
            hashtags = await solar.extract_hashtags(content)
            post = Post(
                id=str(uuid.uuid4()),
                author_id=user.id,
                content=content,
                hashtags=hashtags,
                likes=0,
                comment_ids=[],
                image_base64=None,
                liked_by=[],
                created_at=time.time() - random.randint(0, 86400 * 3),
            )
            post_store.set(post.id, post)
            feed_tree.insert((post.created_at, post.id))
            user.post_ids.append(post.id)
            for tag in hashtags:
                tag_index.setdefault(tag, set()).add(post.id)
        user_store.set(user.username, user)

    for i, user in enumerate(created_users):
        targets = random.sample(
            [u for j, u in enumerate(created_users) if j != i],
            k=random.randint(1, 3),
        )
        for target in targets:
            if target.id in user.following:
                continue
            user.following.append(target.id)
            target.followers.append(user.id)
            social_graph.add_edge(user.id, target.id)
        user_store.set(user.username, user)
        for target in targets:
            user_store.set(target.username, target)

    return {
        "message": "AI 유저 5명 생성 완료",
        "users": [
            {
                "username": u.username,
                "bio": u.bio,
                "interests": u.interests,
                "post_count": len(u.post_ids),
                "following_count": len(u.following),
            }
            for u in created_users
        ],
    }


@router.post("/reset_ai_users")
def reset_ai_users():
    removed_users = []
    removed_posts = 0
    ai_users = [u for u in user_store.values() if getattr(u, "is_ai", False)]
    ai_ids = {u.id for u in ai_users}

    for u in ai_users:
        for post_id in list(u.post_ids):
            if post_store.exists(post_id):
                post = post_store.get(post_id)
                try:
                    feed_tree.delete((post.created_at, post.id))
                except Exception:
                    pass
                for tag in post.hashtags:
                    if tag in tag_index:
                        tag_index[tag].discard(post.id)
                post_store.delete(post_id)
                removed_posts += 1

    for other in user_store.values():
        before = len(other.following)
        other.following = [fid for fid in other.following if fid not in ai_ids]
        other.followers = [fid for fid in other.followers if fid not in ai_ids]
        if len(other.following) != before:
            user_store.set(other.username, other)

    for u in ai_users:
        search_trie.delete(u.username)
        user_store.delete(u.username)
        removed_users.append(u.username)

    return {"removed_users": removed_users, "removed_posts": removed_posts}
