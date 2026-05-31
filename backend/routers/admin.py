from fastapi import APIRouter
import random
import time
import uuid
import urllib.parse
import hashlib

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


def _pollinations_url(prompt: str, seed_key: str) -> str:
    """생성형 AI(Pollinations) 이미지 URL. seed_key로 매 실행마다 동일한 이미지 유지."""
    encoded = urllib.parse.quote(prompt)
    seed = int(hashlib.md5(seed_key.encode("utf-8")).hexdigest(), 16) % 1_000_000
    return (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width=512&height=512&seed={seed}&nologo=true"
    )


def _is_generated_image(image: str | None) -> bool:
    """이미 Pollinations 생성형 이미지가 붙어있는지."""
    return bool(image) and "image.pollinations.ai" in image


PERSONAS = [
    {
        "username": "yuna",
        "bio": "디저트 카페 투어가 취미인 대학생이에요. 신상 베이커리 찾아다녀요 ☕",
        "personality": "달콤한 어휘를 많이 쓰고 카페/베이커리 이야기를 자주 함. 친근한 반말. 이모지 좋아함.",
        "image_emoji": "☕",
        "image_colors": ("#f4a261", "#e76f51"),
        "tags": ["디저트", "카페", "베이커리"],
        "photo_prompt": "cozy aesthetic cafe with pastel desserts and latte art, warm lighting",
    },
    {
        "username": "minho",
        "bio": "주말마다 한강에서 러닝하는 직장인. 마라톤 도전 중!",
        "personality": "운동/체력/도전 정신 강조. 짧고 활기찬 말투. 페이스, 거리 같은 단어 자주 씀.",
        "image_emoji": "🏃",
        "image_colors": ("#2a9d8f", "#264653"),
        "tags": ["러닝", "마라톤", "체력"],
        "photo_prompt": "person jogging at Han River park Seoul at sunrise, scenic",
    },
    {
        "username": "jisoo",
        "bio": "독립 영화관 단골. 최근엔 일본 영화에 빠졌어요 🎬",
        "personality": "감수성 풍부, 영화 평론하듯 이야기. 차분하고 신중한 말투. 작품명을 자주 언급.",
        "image_emoji": "🎬",
        "image_colors": ("#3d348b", "#7678ed"),
        "tags": ["영화", "독립영화", "일본영화"],
        "photo_prompt": "moody indie cinema theater dim lighting empty seats vintage poster",
    },
    {
        "username": "taeyang",
        "bio": "백패킹과 캠핑이 인생의 낙. 별 보러 산으로 갑니다 ⛺",
        "personality": "자연/고요/혼자만의 시간 강조. 시적이고 사색적인 말투. 풍경 묘사를 자주 함.",
        "image_emoji": "⛺",
        "image_colors": ("#2d6a4f", "#52b788"),
        "tags": ["캠핑", "백패킹", "별관측"],
        "photo_prompt": "camping tent under starry night sky in mountain forest, milky way",
    },
    {
        "username": "haeun",
        "bio": "퀼팅과 자수하는 일러스트레이터. 고양이 두 마리 집사 🐈",
        "personality": "따뜻하고 차분한 말투. 작업 진척, 고양이 이야기를 자주 함. 손 작업의 매력 강조.",
        "image_emoji": "🧵",
        "image_colors": ("#f7b6d2", "#c77dff"),
        "tags": ["퀼팅", "자수", "고양이"],
        "photo_prompt": "cozy workspace with embroidery hoop thread and cute cat sleeping nearby",
    },
    {
        "username": "yura",
        "bio": "빈티지 패션 좋아하고 동묘 구제샵 단골입니다. 90년대 감성 ✨",
        "personality": "패션/스타일/빈티지 어휘 자주 사용. 자신감 있고 트렌디한 말투. 90년대 레퍼런스를 좋아함.",
        "image_emoji": "👗",
        "image_colors": ("#cdb4db", "#ffafcc"),
        "tags": ["빈티지", "패션", "구제샵"],
        "photo_prompt": "vintage 90s denim jacket flatlay with retro accessories aesthetic",
    },
    {
        "username": "dohyun",
        "bio": "발로란트 다이아 유지중인 게이머 + 트위치 시청자. 신작도 챙겨요 🎮",
        "personality": "게임 용어(랭크/픽/메타/AD)와 영어 약어 섞어 씀. 캐주얼하고 텐션 높음. 'ㅋㅋ' 자주 사용.",
        "image_emoji": "🎮",
        "image_colors": ("#1a1a2e", "#e94560"),
        "tags": ["게임", "발로란트", "트위치"],
        "photo_prompt": "gaming setup with RGB mechanical keyboard headset multiple monitors at night",
    },
    {
        "username": "seoyeon",
        "bio": "요가 강사 자격증 준비중. 매일 아침 명상 + 필라테스 🧘",
        "personality": "평온하고 부드러운 말투. 호흡/자세/마음챙김 어휘 사용. 긍정적이고 친절함.",
        "image_emoji": "🧘",
        "image_colors": ("#a8dadc", "#457b9d"),
        "tags": ["요가", "필라테스", "명상"],
        "photo_prompt": "yoga pose at sunrise on wooden floor with plants minimalist studio peaceful",
    },
    {
        "username": "taejun",
        "bio": "홍대 인디밴드에서 기타 치는 대학생. 작곡도 시작했어요 🎸",
        "personality": "음악/공연/장르 어휘 사용. 감성적이고 자유분방한 말투. 좋아하는 밴드 자주 언급.",
        "image_emoji": "🎸",
        "image_colors": ("#e63946", "#f1faee"),
        "tags": ["음악", "기타", "밴드"],
        "photo_prompt": "indie band live performance on small stage guitar amp moody lighting",
    },
    {
        "username": "jiwon",
        "bio": "포메 두 마리 집사. 강아지 산책+사진이 일상 🐾",
        "personality": "반려동물 중심 대화. 다정하고 들떠있는 말투. '우리 애기들'이라는 표현 자주 사용.",
        "image_emoji": "🐾",
        "image_colors": ("#ffd6a5", "#fdffb6"),
        "tags": ["강아지", "포메", "산책"],
        "photo_prompt": "cute fluffy pomeranian puppy in autumn park golden hour adorable",
    },
    {
        "username": "jaeyun",
        "bio": "한 달에 책 10권 읽는 독서광. 소설과 에세이를 사랑해요 📚",
        "personality": "문장이 차분하고 사색적. 책 제목/작가/문장 인용을 즐김. 독후감처럼 이야기함.",
        "image_emoji": "📚",
        "image_colors": ("#6d4c41", "#a1887f"),
        "tags": ["독서", "문학", "에세이"],
        "photo_prompt": "cozy reading nook with stacked books warm lamp and coffee aesthetic",
    },
    {
        "username": "soohyun",
        "bio": "필름 카메라 들고 골목 출사 다니는 사진가. 빛을 좋아합니다 📷",
        "personality": "빛/구도/필름 같은 단어를 자주 씀. 감각적이고 관찰력 있는 말투. 장소 묘사를 잘함.",
        "image_emoji": "📷",
        "image_colors": ("#37474f", "#78909c"),
        "tags": ["사진", "필름카메라", "출사"],
        "photo_prompt": "35mm film photography of quiet alley golden hour soft grain analog",
    },
    {
        "username": "minjae",
        "bio": "백엔드 개발자. 주말엔 사이드 프로젝트와 오픈소스 만지작 💻",
        "personality": "기술 용어(API/배포/리팩터링)를 자연스럽게 씀. 논리적이고 담백한 말투. 문제 해결을 즐김.",
        "image_emoji": "💻",
        "image_colors": ("#263238", "#00acc1"),
        "tags": ["개발", "코딩", "사이드프로젝트"],
        "photo_prompt": "developer desk with dual monitors code editor dark theme and coffee night",
    },
    {
        "username": "hayoon",
        "bio": "20대 재테크 공부 중. ETF 적립식 투자 + 가계부 꾸준히 써요 📈",
        "personality": "숫자/복리/분산투자 같은 어휘 사용. 신중하고 현실적인 말투. 절약 팁을 자주 공유.",
        "image_emoji": "📈",
        "image_colors": ("#1b5e20", "#66bb6a"),
        "tags": ["재테크", "투자", "경제"],
        "photo_prompt": "minimalist desk with rising stock chart on laptop notebook and plant clean",
    },
    {
        "username": "doyeon",
        "bio": "베란다를 정글로 만드는 식집사. 몬스테라 키우는 재미에 빠졌어요 🪴",
        "personality": "식물/흙/물주기 이야기를 다정하게 함. 느긋하고 따뜻한 말투. 새 잎이 나면 자랑함.",
        "image_emoji": "🪴",
        "image_colors": ("#2e7d32", "#a5d6a7"),
        "tags": ["반려식물", "가드닝", "몬스테라"],
        "photo_prompt": "sunny balcony full of green houseplants monstera and pots cozy morning light",
    },
    {
        "username": "junseo",
        "bio": "주말 드라이브가 낙인 자동차 덕후. 와인딩 코스와 차박 좋아해요 🚗",
        "personality": "차종/코스/엔진음 같은 어휘 사용. 활기차고 자유로운 말투. 풍경 좋은 길을 추천함.",
        "image_emoji": "🚗",
        "image_colors": ("#b71c1c", "#ef9a9a"),
        "tags": ["자동차", "드라이브", "차박"],
        "photo_prompt": "scenic coastal road drive at sunset car on winding highway cinematic",
    },
    {
        "username": "areum",
        "bio": "실내 클라이밍에 빠진 직장인. 볼더링 난이도 깨는 맛에 살아요 🧗",
        "personality": "홀드/난이도/완등 같은 용어 사용. 도전적이고 에너지 넘치는 말투. 성취담을 즐겨 나눔.",
        "image_emoji": "🧗",
        "image_colors": ("#e65100", "#ffb74d"),
        "tags": ["클라이밍", "볼더링", "운동"],
        "photo_prompt": "indoor bouldering gym colorful climbing holds person reaching dynamic",
    },
    {
        "username": "nara",
        "bio": "손글씨와 다이어리 꾸미기가 취미인 문구 덕후예요 ✍️",
        "personality": "펜/잉크/다꾸 어휘 사용. 아기자기하고 다정한 말투. 예쁜 문구류를 자주 소개.",
        "image_emoji": "✍️",
        "image_colors": ("#ad1457", "#f48fb1"),
        "tags": ["캘리그라피", "문구", "다이어리"],
        "photo_prompt": "flatlay of calligraphy pens ink and decorated journal pastel stationery",
    },
    {
        "username": "gunwoo",
        "bio": "로드바이크로 한강부터 국토종주까지. 페달 밟을 때가 제일 행복 🚴",
        "personality": "라이딩/케이던스/거리 어휘 사용. 씩씩하고 부지런한 말투. 코스와 장비 정보를 공유.",
        "image_emoji": "🚴",
        "image_colors": ("#0277bd", "#4fc3f7"),
        "tags": ["자전거", "로드바이크", "라이딩"],
        "photo_prompt": "road cyclist riding along river path at dawn bicycle scenic motion",
    },
    {
        "username": "subin",
        "bio": "콘서트와 굿즈 모으는 케이팝 덕후. 최애 영업하러 왔어요 🎤",
        "personality": "덕질/최애/콘서트/포카 어휘 사용. 텐션 높고 다정한 말투. 응원과 감탄을 자주 함.",
        "image_emoji": "🎤",
        "image_colors": ("#6a1b9a", "#ce93d8"),
        "tags": ["케이팝", "콘서트", "덕질"],
        "photo_prompt": "kpop concert crowd with glowing lightsticks vibrant stage lights energetic",
    },
]


# 회원가입 시 선택하는 관심 분야 → 관련 정체성을 가진 AI 페르소나(username) 매핑.
# label은 그대로 user.interests에 저장되어 추천 매칭에 사용됨.
INTEREST_CATEGORIES = [
    {"label": "음식·카페", "emoji": "☕", "persona": "yuna"},
    {"label": "운동·러닝", "emoji": "🏃", "persona": "minho"},
    {"label": "영화", "emoji": "🎬", "persona": "jisoo"},
    {"label": "캠핑·아웃도어", "emoji": "⛺", "persona": "taeyang"},
    {"label": "공예·핸드메이드", "emoji": "🧵", "persona": "haeun"},
    {"label": "패션", "emoji": "👗", "persona": "yura"},
    {"label": "게임", "emoji": "🎮", "persona": "dohyun"},
    {"label": "요가·명상", "emoji": "🧘", "persona": "seoyeon"},
    {"label": "음악", "emoji": "🎸", "persona": "taejun"},
    {"label": "반려동물", "emoji": "🐾", "persona": "jiwon"},
    {"label": "독서·문학", "emoji": "📚", "persona": "jaeyun"},
    {"label": "사진", "emoji": "📷", "persona": "soohyun"},
    {"label": "개발·IT", "emoji": "💻", "persona": "minjae"},
    {"label": "재테크·투자", "emoji": "📈", "persona": "hayoon"},
    {"label": "반려식물·가드닝", "emoji": "🪴", "persona": "doyeon"},
    {"label": "자동차·드라이브", "emoji": "🚗", "persona": "junseo"},
    {"label": "클라이밍", "emoji": "🧗", "persona": "areum"},
    {"label": "캘리그라피·문구", "emoji": "✍️", "persona": "nara"},
    {"label": "자전거", "emoji": "🚴", "persona": "gunwoo"},
    {"label": "케이팝·덕질", "emoji": "🎤", "persona": "subin"},
]

_LABEL_TO_PERSONA = {c["label"]: c["persona"] for c in INTEREST_CATEGORIES}
_PERSONA_TO_LABEL = {c["persona"]: c["label"] for c in INTEREST_CATEGORIES}


def personas_for_interests(interests: list[str]) -> list[str]:
    """선택한 관심 분야(label)에 해당하는 AI 페르소나 username 목록."""
    out: list[str] = []
    for label in interests or []:
        pname = _LABEL_TO_PERSONA.get(label)
        if pname and pname not in out:
            out.append(pname)
    return out


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
    "jaeyun": [
        "이번 달 열 번째 책 완독! 에세이는 역시 밤에 읽어야 제맛",
        "밑줄 그은 문장이 너무 많아서 필사 노트가 가득 찼어요",
        "서점 산책하다 충동구매한 소설, 첫 장부터 빠져듭니다",
        "독서 모임에서 토론한 책 추천해요. 여운이 길어요",
        "비 오는 날엔 시집이 어울리네요",
    ],
    "soohyun": [
        "골목 출사 다녀왔어요. 오후 4시 빛이 제일 예쁨",
        "필름 한 롤 현상 맡기고 오는 길, 두근두근",
        "흑백 필름으로 담은 도시의 그림자",
        "역광 사진 좋아하시는 분? 빛 번짐이 매력",
        "오늘의 한 컷, 골목 끝 작은 화분",
    ],
    "minjae": [
        "주말 사이드 프로젝트 배포 완료. 새벽 코딩의 결실 💻",
        "리팩터링하니 코드가 한결 깔끔해졌어요",
        "오픈소스 이슈 하나 해결하고 PR 날렸습니다",
        "API 설계 고민 중인데 의견 환영해요",
        "버그 잡았을 때의 그 짜릿함 아시죠",
    ],
    "hayoon": [
        "이번 달도 ETF 적립식 매수 완료. 꾸준함이 답",
        "가계부 정산하니 새는 돈이 보이네요",
        "복리의 마법, 일찍 시작할수록 좋아요",
        "분산투자 비중 다시 점검하는 주말",
        "경제 기사 스크랩하는 습관 추천합니다",
    ],
    "doyeon": [
        "몬스테라 새 잎이 또 나왔어요! 식집사 행복 🪴",
        "물주기 타이밍 놓쳐서 반성 중...",
        "베란다가 점점 정글이 되어가요",
        "분갈이하고 나니 애들이 쑥쑥 자라네요",
        "초보 식집사에게 추천하는 식물 정리해봤어요",
    ],
    "junseo": [
        "주말 와인딩 코스 다녀왔어요. 풍경 미쳤음 🚗",
        "차박 장비 정리 끝. 다음 주 출발 준비",
        "해안도로 드라이브엔 노을이 빠질 수 없죠",
        "엔진음 들으면 스트레스가 풀려요",
        "드라이브 코스 추천받습니다",
    ],
    "areum": [
        "오늘 빨간색 난이도 완등! 손끝이 얼얼하네요 🧗",
        "볼더링은 머리로 푸는 운동이에요",
        "암장에서 만난 사람들이랑 같이 도전 중",
        "초크 묻은 손 보면 뿌듯함",
        "다음 목표는 오버행 코스 정복",
    ],
    "nara": [
        "새 만년필 잉크 색이 너무 예뻐서 다꾸 각 ✍️",
        "오늘의 손글씨 연습. 획이 조금씩 안정돼요",
        "다이어리 꾸미기 스티커 또 샀어요",
        "캘리그라피 엽서 만들어서 친구한테 선물",
        "문구점은 위험한 곳... 또 지갑이 가벼워짐",
    ],
    "gunwoo": [
        "새벽 라이딩 다녀왔어요. 한강 바람 최고 🚴",
        "이번 주말 국토종주 한 구간 도전합니다",
        "케이던스 유지하는 게 생각보다 어렵네요",
        "자전거 정비하고 체인 갈았어요",
        "라이딩 코스 추천 받아요. 평지 위주로",
    ],
    "subin": [
        "어제 콘서트 다녀왔어요. 아직도 심장 안 진정됨 🎤",
        "포카 교환하실 분 찾습니다",
        "최애 영업 들어갑니다. 일단 한 번 보세요",
        "굿즈 또 질렀어요... 통장은 텅장",
        "응원봉 들고 떼창했던 그 순간 잊을 수 없어",
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
        label = _PERSONA_TO_LABEL.get(persona["username"])
        interests = ([label] if label else []) + list(persona.get("tags", []))
        user = User(
            id=str(uuid.uuid4()),
            username=persona["username"],
            password_hash=auth.hash_password(str(uuid.uuid4())),
            bio=persona["bio"],
            interests=interests,
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
        photo_prompt = persona.get("photo_prompt") or persona.get("bio", "")
        tags = persona.get("tags", [])

        count = min(len(contents), random.randint(3, 5))
        chosen = random.sample(contents, k=count) if contents else []
        for i, content in enumerate(chosen):
            pid = str(uuid.uuid4())
            # 모든 AI 게시물에 생성형 AI 이미지 첨부
            image = _pollinations_url(photo_prompt, pid)
            post = Post(
                id=pid,
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


def backfill_ai_post_images() -> int:
    """기존 AI 유저 게시물 중 생성형 이미지가 없는(또는 옛 SVG) 글에 Pollinations 이미지 부여."""
    persona_by_name = {p["username"]: p for p in PERSONAS}
    updated = 0
    for user in user_store.values():
        if not getattr(user, "is_ai", False):
            continue
        persona = persona_by_name.get(user.username, {})
        photo_prompt = persona.get("photo_prompt") or persona.get("bio", "") or user.bio
        for post_id in user.post_ids:
            if not post_store.exists(post_id):
                continue
            post = post_store.get(post_id)
            if _is_generated_image(post.image_base64):
                continue
            post.image_base64 = _pollinations_url(photo_prompt, post.id)
            post_store.set(post.id, post)
            updated += 1
    return updated


def backfill_ai_user_interests() -> int:
    """기존 AI 유저의 interests에 관심 분야(category label)를 앞쪽에 보강."""
    updated = 0
    for user in user_store.values():
        if not getattr(user, "is_ai", False):
            continue
        label = _PERSONA_TO_LABEL.get(user.username)
        if label and label not in user.interests:
            user.interests = [label] + list(user.interests)
            user_store.set(user.username, user)
            updated += 1
    return updated


def get_persona_personality(username: str) -> str | None:
    for p in PERSONAS:
        if p["username"] == username:
            return p.get("personality")
    return None


def get_persona_photo_prompt(username: str) -> str | None:
    for p in PERSONAS:
        if p["username"] == username:
            return p.get("photo_prompt")
    return None


@router.get("/interest_categories")
def interest_categories():
    """회원가입 관심 분야 선택지."""
    return [{"label": c["label"], "emoji": c["emoji"]} for c in INTEREST_CATEGORIES]


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
