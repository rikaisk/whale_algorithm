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


# 페르소나별 기본 이미지 키워드 (loremflickr 태그). 게시물별 키워드가 없을 때 폴백.
# Pollinations 익명 API가 IP당 동시 1건으로 제한되어 피드에서 대부분 깨지므로 교체함.
IMAGE_KEYWORDS = {
    "dahye": "cafe,dessert",
    "sungjin": "running,marathon",
    "yerin": "cinema,movie",
    "woojin": "camping,tent",
    "boram": "embroidery,cat",
    "sora": "vintage,fashion",
    "kanghyun": "gaming,computer",
    "jimin": "yoga,meditation",
    "hyunwoo": "guitar,band",
    "mirae": "puppy,dog",
    "eunseo": "books,reading",
    "doeun": "camera,photography",
    "seongho": "coding,computer",
    "jaehee": "finance,money",
    "yebin": "plant,gardening",
    "hyeok": "car,road",
    "seula": "climbing,bouldering",
    "gaeun": "calligraphy,stationery",
    "minki": "bicycle,cycling",
    "hana": "concert,stage",
}


def _image_url(keywords: str, seed_key: str) -> str:
    """주제 키워드에 맞는 안정적인 이미지 URL (loremflickr). seed_key로 고정."""
    keywords = keywords or "lifestyle"
    lock = int(hashlib.md5(seed_key.encode("utf-8")).hexdigest(), 16) % 1_000_000
    tag = urllib.parse.quote(keywords)
    return f"https://loremflickr.com/512/512/{tag}?lock={lock}"


def _persona_image_url(username: str, seed_key: str) -> str:
    """페르소나 기본 키워드로 이미지 URL 생성 (DM 등 게시물 맥락이 없을 때)."""
    return _image_url(IMAGE_KEYWORDS.get(username, "lifestyle"), seed_key)


def _needs_new_image(image: str | None) -> bool:
    """안정적 이미지(loremflickr)가 아니면 (없음/옛 SVG/Pollinations) 교체 대상."""
    return not (image and "loremflickr.com" in image)


PERSONAS = [
    {
        "username": "dahye",
        "bio": "디저트 카페 투어가 취미인 대학생이에요. 신상 베이커리 찾아다녀요 ☕",
        "personality": "달콤한 어휘를 많이 쓰고 카페/베이커리 이야기를 자주 함. 친근한 반말. 이모지 좋아함.",
        "image_emoji": "☕",
        "image_colors": ("#f4a261", "#e76f51"),
        "tags": ["디저트", "카페", "베이커리"],
        "photo_prompt": "cozy aesthetic cafe with pastel desserts and latte art, warm lighting",
    },
    {
        "username": "sungjin",
        "bio": "주말마다 한강에서 러닝하는 직장인. 마라톤 도전 중!",
        "personality": "운동/체력/도전 정신 강조. 짧고 활기찬 말투. 페이스, 거리 같은 단어 자주 씀.",
        "image_emoji": "🏃",
        "image_colors": ("#2a9d8f", "#264653"),
        "tags": ["러닝", "마라톤", "체력"],
        "photo_prompt": "person jogging at Han River park Seoul at sunrise, scenic",
    },
    {
        "username": "yerin",
        "bio": "독립 영화관 단골. 최근엔 일본 영화에 빠졌어요 🎬",
        "personality": "감수성 풍부, 영화 평론하듯 이야기. 차분하고 신중한 말투. 작품명을 자주 언급.",
        "image_emoji": "🎬",
        "image_colors": ("#3d348b", "#7678ed"),
        "tags": ["영화", "독립영화", "일본영화"],
        "photo_prompt": "moody indie cinema theater dim lighting empty seats vintage poster",
    },
    {
        "username": "woojin",
        "bio": "백패킹과 캠핑이 인생의 낙. 별 보러 산으로 갑니다 ⛺",
        "personality": "자연/고요/혼자만의 시간 강조. 시적이고 사색적인 말투. 풍경 묘사를 자주 함.",
        "image_emoji": "⛺",
        "image_colors": ("#2d6a4f", "#52b788"),
        "tags": ["캠핑", "백패킹", "별관측"],
        "photo_prompt": "camping tent under starry night sky in mountain forest, milky way",
    },
    {
        "username": "boram",
        "bio": "퀼팅과 자수하는 일러스트레이터. 고양이 두 마리 집사 🐈",
        "personality": "따뜻하고 차분한 말투. 작업 진척, 고양이 이야기를 자주 함. 손 작업의 매력 강조.",
        "image_emoji": "🧵",
        "image_colors": ("#f7b6d2", "#c77dff"),
        "tags": ["퀼팅", "자수", "고양이"],
        "photo_prompt": "cozy workspace with embroidery hoop thread and cute cat sleeping nearby",
    },
    {
        "username": "sora",
        "bio": "빈티지 패션 좋아하고 동묘 구제샵 단골입니다. 90년대 감성 ✨",
        "personality": "패션/스타일/빈티지 어휘 자주 사용. 자신감 있고 트렌디한 말투. 90년대 레퍼런스를 좋아함.",
        "image_emoji": "👗",
        "image_colors": ("#cdb4db", "#ffafcc"),
        "tags": ["빈티지", "패션", "구제샵"],
        "photo_prompt": "vintage 90s denim jacket flatlay with retro accessories aesthetic",
    },
    {
        "username": "kanghyun",
        "bio": "발로란트 다이아 유지중인 게이머 + 트위치 시청자. 신작도 챙겨요 🎮",
        "personality": "게임 용어(랭크/픽/메타/AD)와 영어 약어 섞어 씀. 캐주얼하고 텐션 높음. 'ㅋㅋ' 자주 사용.",
        "image_emoji": "🎮",
        "image_colors": ("#1a1a2e", "#e94560"),
        "tags": ["게임", "발로란트", "트위치"],
        "photo_prompt": "gaming setup with RGB mechanical keyboard headset multiple monitors at night",
    },
    {
        "username": "jimin",
        "bio": "요가 강사 자격증 준비중. 매일 아침 명상 + 필라테스 🧘",
        "personality": "평온하고 부드러운 말투. 호흡/자세/마음챙김 어휘 사용. 긍정적이고 친절함.",
        "image_emoji": "🧘",
        "image_colors": ("#a8dadc", "#457b9d"),
        "tags": ["요가", "필라테스", "명상"],
        "photo_prompt": "yoga pose at sunrise on wooden floor with plants minimalist studio peaceful",
    },
    {
        "username": "hyunwoo",
        "bio": "홍대 인디밴드에서 기타 치는 대학생. 작곡도 시작했어요 🎸",
        "personality": "음악/공연/장르 어휘 사용. 감성적이고 자유분방한 말투. 좋아하는 밴드 자주 언급.",
        "image_emoji": "🎸",
        "image_colors": ("#e63946", "#f1faee"),
        "tags": ["음악", "기타", "밴드"],
        "photo_prompt": "indie band live performance on small stage guitar amp moody lighting",
    },
    {
        "username": "mirae",
        "bio": "포메 두 마리 집사. 강아지 산책+사진이 일상 🐾",
        "personality": "반려동물 중심 대화. 다정하고 들떠있는 말투. '우리 애기들'이라는 표현 자주 사용.",
        "image_emoji": "🐾",
        "image_colors": ("#ffd6a5", "#fdffb6"),
        "tags": ["강아지", "포메", "산책"],
        "photo_prompt": "cute fluffy pomeranian puppy in autumn park golden hour adorable",
    },
    {
        "username": "eunseo",
        "bio": "한 달에 책 10권 읽는 독서광. 소설과 에세이를 사랑해요 📚",
        "personality": "문장이 차분하고 사색적. 책 제목/작가/문장 인용을 즐김. 독후감처럼 이야기함.",
        "image_emoji": "📚",
        "image_colors": ("#6d4c41", "#a1887f"),
        "tags": ["독서", "문학", "에세이"],
        "photo_prompt": "cozy reading nook with stacked books warm lamp and coffee aesthetic",
    },
    {
        "username": "doeun",
        "bio": "필름 카메라 들고 골목 출사 다니는 사진가. 빛을 좋아합니다 📷",
        "personality": "빛/구도/필름 같은 단어를 자주 씀. 감각적이고 관찰력 있는 말투. 장소 묘사를 잘함.",
        "image_emoji": "📷",
        "image_colors": ("#37474f", "#78909c"),
        "tags": ["사진", "필름카메라", "출사"],
        "photo_prompt": "35mm film photography of quiet alley golden hour soft grain analog",
    },
    {
        "username": "seongho",
        "bio": "백엔드 개발자. 주말엔 사이드 프로젝트와 오픈소스 만지작 💻",
        "personality": "기술 용어(API/배포/리팩터링)를 자연스럽게 씀. 논리적이고 담백한 말투. 문제 해결을 즐김.",
        "image_emoji": "💻",
        "image_colors": ("#263238", "#00acc1"),
        "tags": ["개발", "코딩", "사이드프로젝트"],
        "photo_prompt": "developer desk with dual monitors code editor dark theme and coffee night",
    },
    {
        "username": "jaehee",
        "bio": "20대 재테크 공부 중. ETF 적립식 투자 + 가계부 꾸준히 써요 📈",
        "personality": "숫자/복리/분산투자 같은 어휘 사용. 신중하고 현실적인 말투. 절약 팁을 자주 공유.",
        "image_emoji": "📈",
        "image_colors": ("#1b5e20", "#66bb6a"),
        "tags": ["재테크", "투자", "경제"],
        "photo_prompt": "minimalist desk with rising stock chart on laptop notebook and plant clean",
    },
    {
        "username": "yebin",
        "bio": "베란다를 정글로 만드는 식집사. 몬스테라 키우는 재미에 빠졌어요 🪴",
        "personality": "식물/흙/물주기 이야기를 다정하게 함. 느긋하고 따뜻한 말투. 새 잎이 나면 자랑함.",
        "image_emoji": "🪴",
        "image_colors": ("#2e7d32", "#a5d6a7"),
        "tags": ["반려식물", "가드닝", "몬스테라"],
        "photo_prompt": "sunny balcony full of green houseplants monstera and pots cozy morning light",
    },
    {
        "username": "hyeok",
        "bio": "주말 드라이브가 낙인 자동차 덕후. 와인딩 코스와 차박 좋아해요 🚗",
        "personality": "차종/코스/엔진음 같은 어휘 사용. 활기차고 자유로운 말투. 풍경 좋은 길을 추천함.",
        "image_emoji": "🚗",
        "image_colors": ("#b71c1c", "#ef9a9a"),
        "tags": ["자동차", "드라이브", "차박"],
        "photo_prompt": "scenic coastal road drive at sunset car on winding highway cinematic",
    },
    {
        "username": "seula",
        "bio": "실내 클라이밍에 빠진 직장인. 볼더링 난이도 깨는 맛에 살아요 🧗",
        "personality": "홀드/난이도/완등 같은 용어 사용. 도전적이고 에너지 넘치는 말투. 성취담을 즐겨 나눔.",
        "image_emoji": "🧗",
        "image_colors": ("#e65100", "#ffb74d"),
        "tags": ["클라이밍", "볼더링", "운동"],
        "photo_prompt": "indoor bouldering gym colorful climbing holds person reaching dynamic",
    },
    {
        "username": "gaeun",
        "bio": "손글씨와 다이어리 꾸미기가 취미인 문구 덕후예요 ✍️",
        "personality": "펜/잉크/다꾸 어휘 사용. 아기자기하고 다정한 말투. 예쁜 문구류를 자주 소개.",
        "image_emoji": "✍️",
        "image_colors": ("#ad1457", "#f48fb1"),
        "tags": ["캘리그라피", "문구", "다이어리"],
        "photo_prompt": "flatlay of calligraphy pens ink and decorated journal pastel stationery",
    },
    {
        "username": "minki",
        "bio": "로드바이크로 한강부터 국토종주까지. 페달 밟을 때가 제일 행복 🚴",
        "personality": "라이딩/케이던스/거리 어휘 사용. 씩씩하고 부지런한 말투. 코스와 장비 정보를 공유.",
        "image_emoji": "🚴",
        "image_colors": ("#0277bd", "#4fc3f7"),
        "tags": ["자전거", "로드바이크", "라이딩"],
        "photo_prompt": "road cyclist riding along river path at dawn bicycle scenic motion",
    },
    {
        "username": "hana",
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
    {"label": "음식·카페", "emoji": "☕", "persona": "dahye"},
    {"label": "운동·러닝", "emoji": "🏃", "persona": "sungjin"},
    {"label": "영화", "emoji": "🎬", "persona": "yerin"},
    {"label": "캠핑·아웃도어", "emoji": "⛺", "persona": "woojin"},
    {"label": "공예·핸드메이드", "emoji": "🧵", "persona": "boram"},
    {"label": "패션", "emoji": "👗", "persona": "sora"},
    {"label": "게임", "emoji": "🎮", "persona": "kanghyun"},
    {"label": "요가·명상", "emoji": "🧘", "persona": "jimin"},
    {"label": "음악", "emoji": "🎸", "persona": "hyunwoo"},
    {"label": "반려동물", "emoji": "🐾", "persona": "mirae"},
    {"label": "독서·문학", "emoji": "📚", "persona": "eunseo"},
    {"label": "사진", "emoji": "📷", "persona": "doeun"},
    {"label": "개발·IT", "emoji": "💻", "persona": "seongho"},
    {"label": "재테크·투자", "emoji": "📈", "persona": "jaehee"},
    {"label": "반려식물·가드닝", "emoji": "🪴", "persona": "yebin"},
    {"label": "자동차·드라이브", "emoji": "🚗", "persona": "hyeok"},
    {"label": "클라이밍", "emoji": "🧗", "persona": "seula"},
    {"label": "캘리그라피·문구", "emoji": "✍️", "persona": "gaeun"},
    {"label": "자전거", "emoji": "🚴", "persona": "minki"},
    {"label": "케이팝·덕질", "emoji": "🎤", "persona": "hana"},
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


# 게시물 (글 내용, 그 내용에 맞는 영문 이미지 키워드)
FALLBACK_POSTS_BY_USERNAME = {
    "dahye": [
        ("성수동 새로 오픈한 베이커리 다녀왔어요. 크루아상 진심 최고", "bakery,croissant"),
        ("오늘 학교 카페에서 시험 공부. 라떼는 거들 뿐", "cafe,latte,study"),
        ("디저트 투어 with 친구들 🍰 행복", "dessert,cake"),
        ("도쿄 가면 가고 싶은 카페 리스트 작성 중", "tokyo,cafe"),
        ("이번주 신상 빵 후기 정리해서 올릴게요!", "bread,bakery"),
    ],
    "sungjin": [
        ("오늘 10km 러닝 완주. 무릎이 아우성치네요", "running,track"),
        ("마라톤 D-30. 점점 긴장됩니다", "marathon,race"),
        ("한강 야경 보면서 뛰는 거 인생...", "running,night,river"),
        ("러닝화 새로 샀어요. 추천 받습니다", "running,shoes"),
        ("페이스 5분대 진입! 드디어", "running,watch"),
    ],
    "yerin": [
        ("왕가위 영화 다시 정주행 중. 화양연화 또 보고 또 보고", "cinema,film"),
        ("독립영화관 시즌제 끊었어요. 일주일에 두 편씩 보러 갑니다", "movie,theater"),
        ("고레에다 신작 너무 좋았어요. 가족이라는 게 뭘까", "cinema,seats"),
        ("오늘은 단편 영화제. 짧지만 강렬한 작품들", "film,festival"),
        ("이번 주말 시네마테크 가는 사람?", "cinema,projector"),
    ],
    "woojin": [
        ("강원도 별 보러 백패킹. 텐트에서 본 밤하늘 미쳤음", "camping,stars,night"),
        ("캠핑 장비 정리. 다음 주 또 출발", "camping,gear"),
        ("솔로 캠핑의 매력은 고요함", "camping,tent,forest"),
        ("백패킹 코스 추천 받아요. 1박 2일짜리로", "backpacking,trail,mountain"),
        ("산에서 마시는 모닝커피가 진짜", "camping,coffee,mountain"),
    ],
    "boram": [
        ("고양이 두 마리가 자수 실타래에 빠짐. 작업 안 됨", "cat,thread"),
        ("퀼팅 패턴 디자인 중. 봄 컬렉션 준비", "quilting,fabric"),
        ("원데이 클래스 오픈했어요. 자수 입문자 환영", "embroidery,hoop"),
        ("냥이들 사진 보고 갑니다 🐈", "cat,cute"),
        ("손바느질의 매력은 시간이 천천히 흐른다는 것", "sewing,needle"),
    ],
    "sora": [
        ("동묘 구제샵에서 90년대 데님 자켓 득템", "vintage,denim,jacket"),
        ("빈티지 액세서리 모으기 시작", "vintage,accessories"),
        ("오늘의 OOTD: 청청패션 ✨", "fashion,denim,outfit"),
        ("스트릿 무드 좋아하시는 분들 팔로우해요", "street,fashion"),
        ("이번 시즌 컬러는 머스타드", "fashion,mustard,clothes"),
    ],
    "kanghyun": [
        ("발로 솔로큐 다이아 1 진입ㅋㅋ 드디어", "gaming,esports"),
        ("새 헤드셋 도착. 발소리 미쳤음", "headset,gaming"),
        ("신작 RPG 시작. 추천 받음", "videogame,rpg"),
        ("오늘 스트리머 합방 진짜 꿀잼이었음", "streaming,gaming"),
        ("메타 픽 정리 영상 올릴 예정", "gaming,keyboard"),
    ],
    "jimin": [
        ("매일 아침 5시 30분 기상 + 명상 + 요가", "yoga,sunrise"),
        ("필라테스 강사 자격증 시험 D-7", "pilates,studio"),
        ("호흡에 집중하면 하루가 달라져요", "meditation,breathing"),
        ("스트레칭 루틴 공유해드릴게요", "stretching,yoga"),
        ("오늘도 매트 위에서 시작합니다", "yoga,mat"),
    ],
    "hyunwoo": [
        ("홍대 라이브 공연 끝! 음원 곧 올라가요", "live,band,stage"),
        ("오늘 새벽 작곡 중. 영감 폭발", "songwriting,guitar"),
        ("기타 줄 갈아끼우는 시간", "guitar,strings"),
        ("라디오헤드 정주행 중. 역시 명반", "vinyl,music"),
        ("이번 주말 합주실 잡았어요", "band,rehearsal,instruments"),
    ],
    "mirae": [
        ("포메 두 마리랑 한강 산책 🐾", "pomeranian,walk"),
        ("오늘 우리 애기들 미용 다녀왔어요", "dog,grooming"),
        ("강아지 사료 추천받습니다", "dog,food"),
        ("산책 영상 짧게 찍어봤어요", "dog,walk,park"),
        ("강아지 카페 데려갔는데 너무 좋아함", "dog,cafe"),
    ],
    "eunseo": [
        ("이번 달 열 번째 책 완독! 에세이는 역시 밤에 읽어야 제맛", "book,reading,night"),
        ("밑줄 그은 문장이 너무 많아서 필사 노트가 가득 찼어요", "notebook,writing,book"),
        ("서점 산책하다 충동구매한 소설, 첫 장부터 빠져듭니다", "bookstore,novel"),
        ("독서 모임에서 토론한 책 추천해요. 여운이 길어요", "books,bookclub"),
        ("비 오는 날엔 시집이 어울리네요", "book,rain,poetry"),
    ],
    "doeun": [
        ("골목 출사 다녀왔어요. 오후 4시 빛이 제일 예쁨", "photography,alley,light"),
        ("필름 한 롤 현상 맡기고 오는 길, 두근두근", "film,camera"),
        ("흑백 필름으로 담은 도시의 그림자", "blackandwhite,city,photography"),
        ("역광 사진 좋아하시는 분? 빛 번짐이 매력", "backlight,photography"),
        ("오늘의 한 컷, 골목 끝 작은 화분", "plant,alley,photography"),
    ],
    "seongho": [
        ("주말 사이드 프로젝트 배포 완료. 새벽 코딩의 결실 💻", "coding,laptop,night"),
        ("리팩터링하니 코드가 한결 깔끔해졌어요", "code,screen"),
        ("오픈소스 이슈 하나 해결하고 PR 날렸습니다", "programming,computer"),
        ("API 설계 고민 중인데 의견 환영해요", "developer,desk"),
        ("버그 잡았을 때의 그 짜릿함 아시죠", "code,debugging"),
    ],
    "jaehee": [
        ("이번 달도 ETF 적립식 매수 완료. 꾸준함이 답", "stock,chart"),
        ("가계부 정산하니 새는 돈이 보이네요", "budget,money,notebook"),
        ("복리의 마법, 일찍 시작할수록 좋아요", "investing,coins"),
        ("분산투자 비중 다시 점검하는 주말", "finance,graph"),
        ("경제 기사 스크랩하는 습관 추천합니다", "newspaper,finance"),
    ],
    "yebin": [
        ("몬스테라 새 잎이 또 나왔어요! 식집사 행복 🪴", "monstera,plant,leaf"),
        ("물주기 타이밍 놓쳐서 반성 중...", "houseplant,watering"),
        ("베란다가 점점 정글이 되어가요", "balcony,plants,green"),
        ("분갈이하고 나니 애들이 쑥쑥 자라네요", "potting,plant,soil"),
        ("초보 식집사에게 추천하는 식물 정리해봤어요", "houseplants,pots"),
    ],
    "hyeok": [
        ("주말 와인딩 코스 다녀왔어요. 풍경 미쳤음 🚗", "car,road,scenic"),
        ("차박 장비 정리 끝. 다음 주 출발 준비", "car,camping,trunk"),
        ("해안도로 드라이브엔 노을이 빠질 수 없죠", "coastal,road,sunset"),
        ("엔진음 들으면 스트레스가 풀려요", "sportscar,engine"),
        ("드라이브 코스 추천받습니다", "driving,highway"),
    ],
    "seula": [
        ("오늘 빨간색 난이도 완등! 손끝이 얼얼하네요 🧗", "bouldering,climbing,holds"),
        ("볼더링은 머리로 푸는 운동이에요", "climbing,wall"),
        ("암장에서 만난 사람들이랑 같이 도전 중", "climbing,gym"),
        ("초크 묻은 손 보면 뿌듯함", "chalk,climbing,hands"),
        ("다음 목표는 오버행 코스 정복", "overhang,climbing"),
    ],
    "gaeun": [
        ("새 만년필 잉크 색이 너무 예뻐서 다꾸 각 ✍️", "fountainpen,ink"),
        ("오늘의 손글씨 연습. 획이 조금씩 안정돼요", "calligraphy,handwriting"),
        ("다이어리 꾸미기 스티커 또 샀어요", "journal,stickers,stationery"),
        ("캘리그라피 엽서 만들어서 친구한테 선물", "calligraphy,postcard"),
        ("문구점은 위험한 곳... 또 지갑이 가벼워짐", "stationery,shop"),
    ],
    "minki": [
        ("새벽 라이딩 다녀왔어요. 한강 바람 최고 🚴", "cycling,dawn,river"),
        ("이번 주말 국토종주 한 구간 도전합니다", "cycling,road,touring"),
        ("케이던스 유지하는 게 생각보다 어렵네요", "roadbike,cycling"),
        ("자전거 정비하고 체인 갈았어요", "bicycle,repair,chain"),
        ("라이딩 코스 추천 받아요. 평지 위주로", "bicycle,path"),
    ],
    "hana": [
        ("어제 콘서트 다녀왔어요. 아직도 심장 안 진정됨 🎤", "concert,stage,lights"),
        ("포카 교환하실 분 찾습니다", "photocard,collection"),
        ("최애 영업 들어갑니다. 일단 한 번 보세요", "kpop,concert"),
        ("굿즈 또 질렀어요... 통장은 텅장", "merchandise,goods"),
        ("응원봉 들고 떼창했던 그 순간 잊을 수 없어", "lightstick,concert,crowd"),
    ],
}

# 게시물 글 내용 → 영문 이미지 키워드 (기존 게시물 백필 시 내용으로 매칭)
_CONTENT_KEYWORDS = {
    text: kw for posts in FALLBACK_POSTS_BY_USERNAME.values() for (text, kw) in posts
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
        tags = persona.get("tags", [])

        count = min(len(contents), random.randint(3, 5))
        chosen = random.sample(contents, k=count) if contents else []
        for i, (content, kw) in enumerate(chosen):
            pid = str(uuid.uuid4())
            # 게시물 글 내용에 맞는 키워드로 안정적 이미지 첨부
            image = _image_url(kw or IMAGE_KEYWORDS.get(user.username, "lifestyle"), pid)
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
    """AI 게시물의 이미지가 안정적 소스(loremflickr)가 아니면(없음/옛 SVG/Pollinations) 교체."""
    updated = 0
    for user in user_store.values():
        if not getattr(user, "is_ai", False):
            continue
        for post_id in user.post_ids:
            if not post_store.exists(post_id):
                continue
            post = post_store.get(post_id)
            if not _needs_new_image(post.image_base64):
                continue
            # 게시물 글 내용에 맞는 키워드 우선, 없으면 페르소나 기본 키워드
            kw = _CONTENT_KEYWORDS.get(post.content) or IMAGE_KEYWORDS.get(user.username, "lifestyle")
            post.image_base64 = _image_url(kw, post.id)
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


def prune_orphan_ai_users() -> list[str]:
    """현재 PERSONAS에 없는 (옛 이름의) AI 더미 유저와 그 게시물을 정리.

    이름 변경 후 이전 이름의 AI 유저가 남지 않도록 startup에서 호출.
    """
    valid_names = {p["username"] for p in PERSONAS}
    orphans = [
        u for u in user_store.values()
        if getattr(u, "is_ai", False) and u.username not in valid_names
    ]
    if not orphans:
        return []
    orphan_ids = {u.id for u in orphans}

    for u in orphans:
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

    for other in user_store.values():
        if other.id in orphan_ids:
            continue
        before_f, before_fl = len(other.following), len(other.followers)
        other.following = [fid for fid in other.following if fid not in orphan_ids]
        other.followers = [fid for fid in other.followers if fid not in orphan_ids]
        if len(other.following) != before_f or len(other.followers) != before_fl:
            user_store.set(other.username, other)

    removed = []
    for u in orphans:
        search_trie.delete(u.username)
        user_store.delete(u.username)
        removed.append(u.username)
    return removed


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
