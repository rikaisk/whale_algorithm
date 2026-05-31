from fastapi import APIRouter
import random
import time
import uuid
import urllib.parse

from core.store import (
    user_store, post_store, feed_tree, tag_index, search_trie, social_graph,
)
from core.models import User, Post
from core import auth
import core.solar as solar

router = APIRouter(prefix="/admin", tags=["admin"])


def _svg_image(emoji: str, color1: str, color2: str) -> str:
    """Generate a 400x400 SVG data URL with gradient + emoji."""
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{color1}"/>'
        f'<stop offset="1" stop-color="{color2}"/>'
        f'</linearGradient></defs>'
        f'<rect width="400" height="400" fill="url(#g)"/>'
        f'<text x="200" y="240" font-size="160" text-anchor="middle">{emoji}</text>'
        f'</svg>'
    )
    return "data:image/svg+xml;utf8," + urllib.parse.quote(svg)


PERSONAS = [
    {
        "username": "yuna",
        "bio": "디저트 카페 투어가 취미인 대학생이에요. 신상 베이커리 찾아다녀요 ☕",
        "personality": "달콤한 어휘를 많이 쓰고 카페/베이커리 이야기를 자주 함. 친근한 반말. 이모지 좋아함.",
        "image_emoji": "☕",
        "image_colors": ("#f4a261", "#e76f51"),
        "tags": ["디저트", "카페", "베이커리"],
    },
    {
        "username": "minho",
        "bio": "주말마다 한강에서 러닝하는 직장인. 마라톤 도전 중!",
        "personality": "운동/체력/도전 정신 강조. 짧고 활기찬 말투. 페이스, 거리 같은 단어 자주 씀.",
        "image_emoji": "🏃",
        "image_colors": ("#2a9d8f", "#264653"),
        "tags": ["러닝", "마라톤", "체력"],
    },
    {
        "username": "jisoo",
        "bio": "독립 영화관 단골. 최근엔 일본 영화에 빠졌어요 🎬",
        "personality": "감수성 풍부, 영화 평론하듯 이야기. 차분하고 신중한 말투. 작품명을 자주 언급.",
        "image_emoji": "🎬",
        "image_colors": ("#3d348b", "#7678ed"),
        "tags": ["영화", "독립영화", "일본영화"],
    },
    {
        "username": "taeyang",
        "bio": "백패킹과 캠핑이 인생의 낙. 별 보러 산으로 갑니다 ⛺",
        "personality": "자연/고요/혼자만의 시간 강조. 시적이고 사색적인 말투. 풍경 묘사를 자주 함.",
        "image_emoji": "⛺",
        "image_colors": ("#2d6a4f", "#52b788"),
        "tags": ["캠핑", "백패킹", "별관측"],
    },
    {
        "username": "haeun",
        "bio": "퀼팅과 자수하는 일러스트레이터. 고양이 두 마리 집사 🐈",
        "personality": "따뜻하고 차분한 말투. 작업 진척, 고양이 이야기를 자주 함. 손 작업의 매력 강조.",
        "image_emoji": "🧵",
        "image_colors": ("#f7b6d2", "#c77dff"),
        "tags": ["퀼팅", "자수", "고양이"],
    },
    {
        "username": "yura",
        "bio": "빈티지 패션 좋아하고 동묘 구제샵 단골입니다. 90년대 감성 ✨",
        "personality": "패션/스타일/빈티지 어휘 자주 사용. 자신감 있고 트렌디한 말투. 90년대 레퍼런스를 좋아함.",
        "image_emoji": "👗",
        "image_colors": ("#cdb4db", "#ffafcc"),
        "tags": ["빈티지", "패션", "구제샵"],
    },
    {
        "username": "dohyun",
        "bio": "발로란트 다이아 유지중인 게이머 + 트위치 시청자. 신작도 챙겨요 🎮",
        "personality": "게임 용어(랭크/픽/메타/AD)와 영어 약어 섞어 씀. 캐주얼하고 텐션 높음. 'ㅋㅋ' 자주 사용.",
        "image_emoji": "🎮",
        "image_colors": ("#1a1a2e", "#e94560"),
        "tags": ["게임", "발로란트", "트위치"],
    },
    {
        "username": "seoyeon",
        "bio": "요가 강사 자격증 준비중. 매일 아침 명상 + 필라테스 🧘",
        "personality": "평온하고 부드러운 말투. 호흡/자세/마음챙김 어휘 사용. 긍정적이고 친절함.",
        "image_emoji": "🧘",
        "image_colors": ("#a8dadc", "#457b9d"),
        "tags": ["요가", "필라테스", "명상"],
    },
    {
        "username": "taejun",
        "bio": "홍대 인디밴드에서 기타 치는 대학생. 작곡도 시작했어요 🎸",
        "personality": "음악/공연/장르 어휘 사용. 감성적이고 자유분방한 말투. 좋아하는 밴드 자주 언급.",
        "image_emoji": "🎸",
        "image_colors": ("#e63946", "#f1faee"),
        "tags": ["음악", "기타", "밴드"],
    },
    {
        "username": "jiwon",
        "bio": "포메 두 마리 집사. 강아지 산책+사진이 일상 🐾",
        "personality": "반려동물 중심 대화. 다정하고 들떠있는 말투. '우리 애기들'이라는 표현 자주 사용.",
        "image_emoji": "🐾",
        "image_colors": ("#ffd6a5", "#fdffb6"),
        "tags": ["강아지", "포메", "산책"],
    },
]


FALLBACK_POSTS_BY_USERNAME = {
    "yuna": [
        "성수동 새로 오픈한 베이커리 다녀왔어요. 크루아상 진심 최고",
        "오늘 학교 카페에서 시험 공부. 라떼는 거들 뿐",
        "디저트 투어 with 친구들 🍰 행복",
        "도쿄 가면 가고 싶은 카페 리스트 작성 중",
        "이번주 신상 빵 후기 정리해서 올릴게요!",
    ],
    "minho": [
        "오늘 10km 러닝 완주. 무릎이 아우성치네요",
        "마라톤 D-30. 점점 긴장됩니다",
        "한강 야경 보면서 뛰는 거 인생...",
        "러닝화 새로 샀어요. 추천 받습니다",
        "페이스 5분대 진입! 드디어",
    ],
    "jisoo": [
        "왕가위 영화 다시 정주행 중. 화양연화 또 보고 또 보고",
        "독립영화관 시즌제 끊었어요. 일주일에 두 편씩 보러 갑니다",
        "고레에다 신작 너무 좋았어요. 가족이라는 게 뭘까",
        "오늘은 단편 영화제. 짧지만 강렬한 작품들",
        "이번 주말 시네마테크 가는 사람?",
    ],
    "taeyang": [
        "강원도 별 보러 백패킹. 텐트에서 본 밤하늘 미쳤음",
        "캠핑 장비 정리. 다음 주 또 출발",
        "솔로 캠핑의 매력은 고요함",
        "백패킹 코스 추천 받아요. 1박 2일짜리로",
        "산에서 마시는 모닝커피가 진짜",
    ],
    "haeun": [
        "고양이 두 마리가 자수 실타래에 빠짐. 작업 안 됨",
        "퀼팅 패턴 디자인 중. 봄 컬렉션 준비",
        "원데이 클래스 오픈했어요. 자수 입문자 환영",
        "냥이들 사진 보고 갑니다 🐈",
        "손바느질의 매력은 시간이 천천히 흐른다는 것",
    ],
    "yura": [
        "동묘 구제샵에서 90년대 데님 자켓 득템",
        "빈티지 액세서리 모으기 시작",
        "오늘의 OOTD: 청청패션 ✨",
        "스트릿 무드 좋아하시는 분들 팔로우해요",
        "이번 시즌 컬러는 머스타드",
    ],
    "dohyun": [
        "발로 솔로큐 다이아 1 진입ㅋㅋ 드디어",
        "새 헤드셋 도착. 발소리 미쳤음",
        "신작 RPG 시작. 추천 받음",
        "오늘 스트리머 합방 진짜 꿀잼이었음",
        "메타 픽 정리 영상 올릴 예정",
    ],
    "seoyeon": [
        "매일 아침 5시 30분 기상 + 명상 + 요가",
        "필라테스 강사 자격증 시험 D-7",
        "호흡에 집중하면 하루가 달라져요",
        "스트레칭 루틴 공유해드릴게요",
        "오늘도 매트 위에서 시작합니다",
    ],
    "taejun": [
        "홍대 라이브 공연 끝! 음원 곧 올라가요",
        "오늘 새벽 작곡 중. 영감 폭발",
        "기타 줄 갈아끼우는 시간",
        "라디오헤드 정주행 중. 역시 명반",
        "이번 주말 합주실 잡았어요",
    ],
    "jiwon": [
        "포메 두 마리랑 한강 산책 🐾",
        "오늘 우리 애기들 미용 다녀왔어요",
        "강아지 사료 추천받습니다",
        "산책 영상 짧게 찍어봤어요",
        "강아지 카페 데려갔는데 너무 좋아함",
    ],
}


def seed_ai_users_fallback_only() -> list[str]:
    # Top-up missing personas instead of all-or-nothing
    existing_names = {u.username.lower() for u in user_store.values()}
    created_users: list[User] = []

    for persona in PERSONAS:
        if persona["username"].lower() in existing_names:
            continue
        existing_names.add(persona["username"].lower())
        user = User(
            id=str(uuid.uuid4()),
            username=persona["username"],
            password_hash=auth.hash_password(str(uuid.uuid4())),
            bio=persona["bio"],
            interests=list(persona.get("tags", [])),
            following=[],
            followers=[],
            post_ids=[],
            avatar_base64=None,
            is_ai=True,
            created_at=time.time(),
        )
        user_store.set(user.username, user)
        search_trie.insert(user.username, user.username)
        social_graph.add_node(user.id)
        created_users.append(user)

    # Build helper map to look up persona traits by username
    persona_by_name = {p["username"]: p for p in PERSONAS}

    for user in created_users:
        persona = persona_by_name.get(user.username, {})
        contents = FALLBACK_POSTS_BY_USERNAME.get(user.username, [])
        image_emoji = persona.get("image_emoji", "✨")
        c1, c2 = persona.get("image_colors", ("#94a3b8", "#475569"))
        tags = persona.get("tags", [])

        count = min(len(contents), random.randint(3, 5))
        chosen = random.sample(contents, k=count) if contents else []
        for i, content in enumerate(chosen):
            image = _svg_image(image_emoji, c1, c2) if i == 0 else None
            post = Post(
                id=str(uuid.uuid4()),
                author_id=user.id,
                content=content,
                hashtags=list(tags),
                likes=random.randint(0, 8),
                comment_ids=[],
                image_base64=image,
                liked_by=[],
                created_at=time.time() - random.randint(0, 86400 * 5),
            )
            post_store.set(post.id, post)
            feed_tree.insert((post.created_at, post.id))
            user.post_ids.append(post.id)
            for tag in tags:
                tag_index.setdefault(tag, set()).add(post.id)
        user_store.set(user.username, user)

    for i, user in enumerate(created_users):
        others = [u for j, u in enumerate(created_users) if j != i]
        if not others:
            continue
        targets = random.sample(others, k=min(len(others), random.randint(2, 4)))
        for target in targets:
            if target.id in user.following:
                continue
            user.following.append(target.id)
            target.followers.append(user.id)
            social_graph.add_edge(user.id, target.id)
        user_store.set(user.username, user)
        for target in targets:
            user_store.set(target.username, target)

    return [u.username for u in created_users]


def get_persona_personality(username: str) -> str | None:
    for p in PERSONAS:
        if p["username"] == username:
            return p.get("personality")
    return None


@router.post("/seed_ai_users")
async def seed_ai_users():
    """Solar 호출과 함께 풍성하게 시드. fallback 시드와 별개."""
    existing_ai = [u for u in user_store.values() if getattr(u, "is_ai", False)]
    if existing_ai:
        return {
            "message": "AI 유저가 이미 존재합니다.",
            "existing": [u.username for u in existing_ai],
        }
    created = seed_ai_users_fallback_only()
    return {
        "message": f"AI 유저 {len(created)}명 생성 완료",
        "users": created,
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
