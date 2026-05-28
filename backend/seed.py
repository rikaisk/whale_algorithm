"""
Dummy data seeding script.
Usage: SEED_DATA=1 uvicorn main:app --reload --port 8000
"""

import uuid
import time
import random
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from core.models import User, Post, Comment
from core.store import (
    user_store, post_store, comment_store,
    feed_tree, search_trie, tag_index, social_graph,
)

USERS_DATA = [
    {"username": "jimin", "bio": "서울 사는 대학생. 카페 탐방과 사진 찍는 걸 좋아해요", "interests": ["카페", "사진", "서울", "대학생", "일상"]},
    {"username": "subin", "bio": "맛집 탐방러 / 요리 블로거 / 여행 다니는 중", "interests": ["맛집", "요리", "여행", "블로그", "음식"]},
    {"username": "minjun", "bio": "개발자 지망생. Python과 알고리즘 공부 중입니다", "interests": ["개발", "Python", "알고리즘", "코딩", "기술"]},
    {"username": "yuna", "bio": "그림 그리고 음악 듣는 게 취미. 고양이 집사", "interests": ["그림", "음악", "고양이", "예술", "일러스트"]},
    {"username": "dongho", "bio": "헬스와 러닝이 일상. 건강한 라이프스타일 추구", "interests": ["헬스", "러닝", "건강", "운동", "다이어트"]},
    {"username": "soyeon", "bio": "책 읽고 글 쓰는 걸 좋아하는 문학 전공생", "interests": ["독서", "글쓰기", "문학", "에세이", "책"]},
    {"username": "hyunwoo", "bio": "AI/ML 연구하는 대학원생. 테크 뉴스 좋아함", "interests": ["AI", "ML", "기술", "연구", "데이터"]},
    {"username": "eunji", "bio": "여행과 카페를 사랑하는 직장인. 주말엔 무조건 나돌아다님", "interests": ["여행", "카페", "주말", "힐링", "일상"]},
    {"username": "taehyung", "bio": "음악 프로듀서 지망생. 힙합, 알앤비, 재즈 다 좋아해요", "interests": ["음악", "힙합", "프로듀싱", "재즈", "사운드"]},
    {"username": "minji", "bio": "디자인 전공 / UI/UX에 관심 많아요 / 카페인 중독", "interests": ["디자인", "UI", "UX", "커피", "창작"]},
    {"username": "jihoon", "bio": "게임 개발자. Unity와 Unreal 다룹니다. 인디게임 만드는 중", "interests": ["게임", "Unity", "개발", "인디게임", "프로그래밍"]},
    {"username": "hayoung", "bio": "패션 & 뷰티 인플루언서. OOTD 매일 올려요!", "interests": ["패션", "뷰티", "OOTD", "스타일", "쇼핑"]},
    {"username": "seojin", "bio": "영화 덕후. 일주일에 영화 3편은 기본. 리뷰 블로그 운영 중", "interests": ["영화", "리뷰", "넷플릭스", "시네마", "감상"]},
    {"username": "woojin", "bio": "바리스타 & 카페 사장. 원두 로스팅이 취미입니다", "interests": ["커피", "바리스타", "카페", "로스팅", "원두"]},
    {"username": "nayeon", "bio": "요가 강사 / 명상 좋아하는 사람 / 비건 라이프", "interests": ["요가", "명상", "비건", "건강", "웰빙"]},
    {"username": "chanwoo", "bio": "사진작가 지망생. 풍경, 인물, 스트릿 다 찍어요", "interests": ["사진", "풍경", "인물", "스트릿", "카메라"]},
    {"username": "soojin", "bio": "베이킹 덕후! 매주 새로운 레시피 도전 중. 디저트가 인생", "interests": ["베이킹", "디저트", "레시피", "케이크", "요리"]},
    {"username": "jungwon", "bio": "축구 미치광이. 주말마다 풋살하고 해외축구 정주행", "interests": ["축구", "풋살", "스포츠", "해외축구", "운동"]},
    {"username": "dahyun", "bio": "식물 키우는 게 취미. 우리집 정글화 프로젝트 진행 중", "interests": ["식물", "가드닝", "인테리어", "플랜테리어", "힐링"]},
    {"username": "sunwoo", "bio": "대학원에서 천문학 연구 중. 별 보는 거 좋아합니다", "interests": ["천문학", "별", "과학", "우주", "연구"]},
    {"username": "arin", "bio": "뮤지컬 배우 지망생. 노래와 연기가 일상이에요", "interests": ["뮤지컬", "노래", "연기", "공연", "예술"]},
    {"username": "gunwoo", "bio": "자전거 여행가. 전국 일주 도전 중. 캠핑도 좋아해요", "interests": ["자전거", "여행", "캠핑", "아웃도어", "일주"]},
    {"username": "yerin", "bio": "일본어/영어 통번역사. 언어 배우는 게 재밌어요", "interests": ["일본어", "영어", "번역", "언어", "문화"]},
    {"username": "taemin", "bio": "스타트업 창업자. 기술로 세상을 바꾸고 싶어요", "interests": ["창업", "스타트업", "기술", "비즈니스", "혁신"]},
    {"username": "chaeyoung", "bio": "피아노 전공생. 클래식부터 재즈까지 다 좋아해요", "interests": ["피아노", "클래식", "재즈", "음악", "연주"]},
]

POSTS_DATA = [
    # jimin
    {"author": "jimin", "content": "오늘 성수동 새로 생긴 카페 다녀왔는데 분위기 미쳤다.. 인테리어 진짜 예쁘고 라떼도 맛있었어요", "hashtags": ["카페", "성수동", "일상"]},
    {"author": "jimin", "content": "한강 석양 타임랩스 찍었는데 진짜 잘 나왔다 ㅎㅎ 요즘 사진 실력 늘은 듯?", "hashtags": ["사진", "한강", "석양"]},
    {"author": "jimin", "content": "시험 끝나고 친구들이랑 홍대 놀러옴! 역시 금요일 밤이 최고", "hashtags": ["홍대", "대학생", "금요일"]},
    {"author": "jimin", "content": "비 오는 날 창가 자리에서 커피 한 잔.. 이런 여유가 좋다", "hashtags": ["카페", "비", "여유"]},
    # subin
    {"author": "subin", "content": "을지로 숨은 맛집 발견! 40년 된 칼국수집인데 육수가 진짜 깊다.. 웨이팅 각오하세요", "hashtags": ["맛집", "을지로", "칼국수"]},
    {"author": "subin", "content": "집에서 파스타 만들어봤는데 레스토랑급 나옴 ㅋㅋ 레시피 공유할게요!", "hashtags": ["요리", "파스타", "홈쿡"]},
    {"author": "subin", "content": "제주도 3박4일 먹방 여행 완료! 흑돼지, 회, 감귤 디저트까지.. 배터져", "hashtags": ["여행", "제주도", "맛집"]},
    {"author": "subin", "content": "오늘 만든 김치찌개가 역대급이었다.. 비법은 돼지고기를 먼저 볶는 것!", "hashtags": ["요리", "김치찌개", "홈쿡"]},
    # minjun
    {"author": "minjun", "content": "드디어 알고리즘 프로젝트 완성했다! React + FastAPI 조합 진짜 좋네요", "hashtags": ["개발", "코딩", "프로젝트"]},
    {"author": "minjun", "content": "오늘 코딩테스트 봤는데 그래프 문제가 나왔다.. BFS로 풀었는데 맞았으려나", "hashtags": ["코딩", "알고리즘", "취준"]},
    {"author": "minjun", "content": "새벽 3시 코딩 중.. 커피가 나를 살린다. 내일까지 마감인데 할 수 있다!", "hashtags": ["개발", "새벽", "코딩"]},
    {"author": "minjun", "content": "TypeScript 타입 시스템 진짜 강력하다.. 처음엔 귀찮았는데 이제 없으면 불안함", "hashtags": ["개발", "TypeScript", "프로그래밍"]},
    # yuna
    {"author": "yuna", "content": "새로 그린 일러스트! 봄 느낌으로 수채화 터치 넣어봤어요", "hashtags": ["그림", "일러스트", "예술"]},
    {"author": "yuna", "content": "우리 냥이가 또 키보드 위에 올라가서 코드 다 날림.. 귀여워서 용서", "hashtags": ["고양이", "일상", "집사"]},
    {"author": "yuna", "content": "오늘 들은 재즈 플레이리스트 너무 좋아서 공유! 비 오는 날에 딱이에요", "hashtags": ["음악", "재즈", "플레이리스트"]},
    {"author": "yuna", "content": "아이패드로 그림 그리기 시작했는데 프로크리에이트 진짜 좋다", "hashtags": ["그림", "아이패드", "디지털아트"]},
    # dongho
    {"author": "dongho", "content": "오늘 데드리프트 PR 갱신! 180kg 성공. 꾸준히 하니까 되네", "hashtags": ["헬스", "운동", "데드리프트"]},
    {"author": "dongho", "content": "아침 6시 한강 러닝 10km 완주! 새벽 공기가 진짜 상쾌하다", "hashtags": ["러닝", "한강", "운동"]},
    {"author": "dongho", "content": "닭가슴살 에어프라이어 레시피 개발함 ㅋㅋ 다이어트 식단도 맛있을 수 있어!", "hashtags": ["건강", "다이어트", "요리"]},
    {"author": "dongho", "content": "오늘부터 벌크업 시작! 목표 체중까지 3개월 계획 세웠다", "hashtags": ["헬스", "벌크업", "운동"]},
    # soyeon
    {"author": "soyeon", "content": "무라카미 하루키 새 소설 읽는 중.. 역시 문체가 독특해. 밤새 읽을 것 같아", "hashtags": ["독서", "하루키", "소설"]},
    {"author": "soyeon", "content": "카페에서 에세이 쓰는 중. 창밖으로 비 내리는 거 보면서 글 쓰면 집중 잘 돼요", "hashtags": ["글쓰기", "카페", "에세이"]},
    {"author": "soyeon", "content": "이번 주 읽은 책 3권 리뷰 올려요! 다들 뭐 읽고 계세요?", "hashtags": ["독서", "책", "리뷰"]},
    {"author": "soyeon", "content": "교보문고에서 2시간 동안 앉아서 책 읽었다.. 행복한 토요일", "hashtags": ["독서", "책", "주말"]},
    # hyunwoo
    {"author": "hyunwoo", "content": "Transformer 논문 스터디 끝! Attention 메커니즘 드디어 이해했다", "hashtags": ["AI", "ML", "연구"]},
    {"author": "hyunwoo", "content": "오늘 학회 발표 잘 마쳤다! 질문 많이 받아서 떨렸지만 뿌듯하네", "hashtags": ["연구", "학회", "대학원"]},
    {"author": "hyunwoo", "content": "추천 시스템 만들어보는 중. 협업 필터링이 생각보다 재밌다", "hashtags": ["AI", "기술", "코딩"]},
    {"author": "hyunwoo", "content": "GPT-5 나왔는데 성능이 미쳤다.. 이제 진짜 AGI 가까워지는 건가", "hashtags": ["AI", "기술", "GPT"]},
    # eunji
    {"author": "eunji", "content": "주말에 양양 서핑 다녀왔어요! 파도 타는 거 진짜 중독성 있다", "hashtags": ["여행", "서핑", "양양"]},
    {"author": "eunji", "content": "퇴근 후 연남동 카페에서 힐링 중.. 오늘 하루도 고생했다 나 자신", "hashtags": ["카페", "연남동", "힐링"]},
    {"author": "eunji", "content": "다음 달 일본 여행 계획 짜는 중! 오사카 맛집 추천 받아요", "hashtags": ["여행", "일본", "맛집"]},
    {"author": "eunji", "content": "방콕 야시장에서 먹은 팟타이가 잊을 수 없다.. 또 가고 싶어", "hashtags": ["여행", "방콕", "음식"]},
    # taehyung
    {"author": "taehyung", "content": "새로운 비트 만들었는데 듣고 피드백 주실 분? 힙합 느낌으로 만들어봤어요", "hashtags": ["음악", "힙합", "프로듀싱"]},
    {"author": "taehyung", "content": "홍대 버스킹 구경 갔는데 실력 있는 분들 많더라.. 자극 받고 옴", "hashtags": ["음악", "홍대", "버스킹"]},
    {"author": "taehyung", "content": "밤새 작업하다 보니까 새벽 5시.. 근데 이 곡은 진짜 잘 나온 것 같아", "hashtags": ["프로듀싱", "음악", "새벽"]},
    {"author": "taehyung", "content": "새로 산 MIDI 키보드 리뷰! 가성비 끝판왕이에요", "hashtags": ["음악", "장비", "리뷰"]},
    # minji
    {"author": "minji", "content": "UI 디자인 리뉴얼 작업 완료! 깔끔한 미니멀 스타일로 갔어요", "hashtags": ["디자인", "UI", "미니멀"]},
    {"author": "minji", "content": "오늘만 커피 3잔째.. 디자이너의 숙명인 건가 ㅋㅋ 그래도 맛있으니까", "hashtags": ["커피", "디자인", "일상"]},
    {"author": "minji", "content": "피그마 새 기능 써봤는데 Auto Layout 업데이트 진짜 좋다!", "hashtags": ["디자인", "UX", "피그마"]},
    {"author": "minji", "content": "디자인 시스템 구축 완료했다! 컴포넌트 100개 넘게 만들었는데 뿌듯", "hashtags": ["디자인", "UI", "시스템"]},
    # jihoon
    {"author": "jihoon", "content": "인디게임 데모 버전 드디어 완성! 스팀에 곧 올릴 예정이에요", "hashtags": ["게임", "인디게임", "개발"]},
    {"author": "jihoon", "content": "Unity에서 셰이더 프로그래밍 하는데 빛 표현이 예술이다..", "hashtags": ["게임", "Unity", "프로그래밍"]},
    {"author": "jihoon", "content": "게임잼 48시간 만에 게임 하나 완성했다! 잠은 4시간밖에 못 잤지만 만족", "hashtags": ["게임", "게임잼", "개발"]},
    {"author": "jihoon", "content": "요즘 발더스 게이트 3 하는 중인데 스토리 미쳤다.. 갓겜 인정", "hashtags": ["게임", "RPG", "리뷰"]},
    # hayoung
    {"author": "hayoung", "content": "오늘의 OOTD! 가을 감성 코듀로이 자켓 코디해봤어요", "hashtags": ["패션", "OOTD", "가을코디"]},
    {"author": "hayoung", "content": "신상 립스틱 리뷰! 발색이 진짜 예쁘고 지속력도 좋아요", "hashtags": ["뷰티", "립스틱", "리뷰"]},
    {"author": "hayoung", "content": "성수동 팝업스토어 다녀왔는데 굿즈가 너무 귀여웠어!", "hashtags": ["패션", "팝업스토어", "성수동"]},
    {"author": "hayoung", "content": "겨울 니트 하울! 이번에 5개 샀는데 다 예쁘다 ㅠㅠ 고르기 힘들었어", "hashtags": ["패션", "하울", "쇼핑"]},
    # seojin
    {"author": "seojin", "content": "듄 파트2 봤는데 영상미가 역대급이다.. 빌뇌브 감독 진짜 천재", "hashtags": ["영화", "듄", "리뷰"]},
    {"author": "seojin", "content": "이번 주 넷플릭스 신작 3개 정주행 완료! 그 중 하나는 꼭 봐야 해요", "hashtags": ["넷플릭스", "영화", "드라마"]},
    {"author": "seojin", "content": "영화관에서 IMAX로 보는 맛이 있지.. 집에서는 그 감동을 못 따라가", "hashtags": ["영화", "IMAX", "시네마"]},
    {"author": "seojin", "content": "올해 본 영화 중 베스트 5 정리해봤어요. 1위는 압도적으로...", "hashtags": ["영화", "베스트", "리뷰"]},
    # woojin
    {"author": "woojin", "content": "오늘 새로운 에티오피아 원두 로스팅 했는데 블루베리 향이 미쳤다", "hashtags": ["커피", "로스팅", "원두"]},
    {"author": "woojin", "content": "카페 리뉴얼 오픈 준비 중! 새로운 메뉴 개발이 제일 재밌어요", "hashtags": ["카페", "커피", "메뉴"]},
    {"author": "woojin", "content": "핸드드립 vs 에스프레소, 여러분은 뭐 더 좋아하세요?", "hashtags": ["커피", "핸드드립", "바리스타"]},
    {"author": "woojin", "content": "라떼아트 연습 중인데 하트는 이제 완벽해졌다! 다음은 로제타 도전", "hashtags": ["커피", "라떼아트", "바리스타"]},
    # nayeon
    {"author": "nayeon", "content": "아침 요가 루틴 공유해요! 10분이면 하루가 달라집니다", "hashtags": ["요가", "아침루틴", "건강"]},
    {"author": "nayeon", "content": "비건 브런치 만들어봤어요. 두부 스크램블이 진짜 계란 같아!", "hashtags": ["비건", "브런치", "요리"]},
    {"author": "nayeon", "content": "명상 앱 추천! 매일 10분씩 하니까 확실히 마음이 편안해졌어요", "hashtags": ["명상", "웰빙", "추천"]},
    {"author": "nayeon", "content": "제주도 힐링 요가 리트릿 다녀왔는데 인생이 바뀌는 경험이었어", "hashtags": ["요가", "제주도", "힐링"]},
    # chanwoo
    {"author": "chanwoo", "content": "새벽 골든아워에 찍은 서울 스카이라인! 이 빛은 진짜 기다린 보람이 있다", "hashtags": ["사진", "서울", "풍경"]},
    {"author": "chanwoo", "content": "스트릿 포토 시리즈 새로 시작했어요. 도시의 숨은 이야기를 담고 싶다", "hashtags": ["사진", "스트릿", "도시"]},
    {"author": "chanwoo", "content": "필름카메라 감성이 디지털로는 안 나와.. 오늘도 필름으로 찍었다", "hashtags": ["사진", "필름", "카메라"]},
    {"author": "chanwoo", "content": "사진 전시회 준비 중! 주제는 '서울의 밤'. 기대해주세요", "hashtags": ["사진", "전시회", "서울"]},
    # soojin
    {"author": "soojin", "content": "마카롱 새로운 맛 개발 성공! 얼그레이 + 무화과 조합이 미쳤다", "hashtags": ["베이킹", "마카롱", "디저트"]},
    {"author": "soojin", "content": "생일 케이크 주문 들어왔는데 이번엔 3단 케이크 도전! 떨린다", "hashtags": ["베이킹", "케이크", "주문"]},
    {"author": "soojin", "content": "크루아상 만들기 3번째 시도.. 겹겹이 쌓이는 버터 층이 예술이야", "hashtags": ["베이킹", "크루아상", "레시피"]},
    {"author": "soojin", "content": "베이킹 클래스 첫 수업 끝! 수강생들이 다 잘 따라와줘서 뿌듯했어요", "hashtags": ["베이킹", "클래스", "디저트"]},
    # jungwon
    {"author": "jungwon", "content": "오늘 풋살에서 해트트릭 달성! 요즘 슛 감각이 살아있다", "hashtags": ["풋살", "축구", "운동"]},
    {"author": "jungwon", "content": "프리미어리그 경기 보다가 소리 질러서 옆집에서 항의옴 ㅋㅋ", "hashtags": ["축구", "프리미어리그", "해외축구"]},
    {"author": "jungwon", "content": "새 축구화 샀는데 그립감이 미쳤다.. 이거 신고 다음 경기 뛰어야지", "hashtags": ["축구", "축구화", "운동"]},
    {"author": "jungwon", "content": "월드컵 예선 한국 경기 보면서 치킨 시켰다. 이게 인생이지!", "hashtags": ["축구", "월드컵", "치킨"]},
    # dahyun
    {"author": "dahyun", "content": "몬스테라가 드디어 새 잎을 냈어요! 3주 동안 기다린 보람이 있다", "hashtags": ["식물", "몬스테라", "가드닝"]},
    {"author": "dahyun", "content": "우리집 베란다 정원 업데이트! 허브 코너 새로 만들었어요", "hashtags": ["식물", "가드닝", "인테리어"]},
    {"author": "dahyun", "content": "다육이 화분 만들기 원데이클래스 다녀왔는데 너무 힐링이었어", "hashtags": ["식물", "다육이", "힐링"]},
    {"author": "dahyun", "content": "플랜트샵에서 희귀 식물 겟했다! 바리에가타 진짜 예뻐 ㅠㅠ", "hashtags": ["식물", "플랜테리어", "가드닝"]},
    # sunwoo
    {"author": "sunwoo", "content": "오늘 밤 유성우 관측 예정! 장비 세팅 완료. 맑았으면 좋겠다", "hashtags": ["천문학", "유성우", "관측"]},
    {"author": "sunwoo", "content": "제임스 웹 망원경 새 사진 봤는데 우주의 신비란.. 말로 표현이 안 돼", "hashtags": ["우주", "천문학", "과학"]},
    {"author": "sunwoo", "content": "천문대에서 목성 관측 성공! 줄무늬가 선명하게 보였어요", "hashtags": ["천문학", "목성", "관측"]},
    {"author": "sunwoo", "content": "논문 리젝 먹었다.. 리뷰어 코멘트 보고 다시 수정해야지 힘내자", "hashtags": ["연구", "대학원", "논문"]},
    # arin
    {"author": "arin", "content": "뮤지컬 오디션 콜백 받았다!! 떨리지만 최선을 다할 거예요", "hashtags": ["뮤지컬", "오디션", "꿈"]},
    {"author": "arin", "content": "보이스 레슨 받고 왔는데 고음이 점점 편해지고 있어! 연습은 배신하지 않는다", "hashtags": ["노래", "보이스", "연습"]},
    {"author": "arin", "content": "대학로 소극장에서 공연 봤는데 감동 받아서 울었다.. 나도 저런 배우가 될 거야", "hashtags": ["뮤지컬", "공연", "대학로"]},
    {"author": "arin", "content": "오늘 연기 수업에서 칭찬 받았다! 선생님이 감정 표현이 좋아졌대", "hashtags": ["연기", "수업", "예술"]},
    # gunwoo
    {"author": "gunwoo", "content": "자전거로 서울-부산 완주했다!! 5일간의 대장정.. 다리는 아프지만 행복해", "hashtags": ["자전거", "여행", "서울부산"]},
    {"author": "gunwoo", "content": "캠핑장에서 별 보면서 라면 끓여 먹는 게 최고의 행복이야", "hashtags": ["캠핑", "별", "자연"]},
    {"author": "gunwoo", "content": "새 자전거 도착! 카본 프레임에 디스크 브레이크.. 타보니까 하늘을 나는 기분", "hashtags": ["자전거", "장비", "라이딩"]},
    {"author": "gunwoo", "content": "단양 패러글라이딩 해봤는데 인생에서 가장 짜릿한 경험이었다!!", "hashtags": ["아웃도어", "패러글라이딩", "여행"]},
    # yerin
    {"author": "yerin", "content": "일본어 JLPT N1 합격했다!! 1년 동안 열심히 한 보람이 있네요", "hashtags": ["일본어", "JLPT", "합격"]},
    {"author": "yerin", "content": "번역 작업 마감 완료! 소설 번역은 정말 창작에 가까운 작업이에요", "hashtags": ["번역", "소설", "일본어"]},
    {"author": "yerin", "content": "영어 회화 스터디 모집합니다! 주 2회, 강남역 카페에서 해요", "hashtags": ["영어", "회화", "스터디"]},
    {"author": "yerin", "content": "도쿄 출장 다녀왔는데 통역하면서 맛집 투어까지.. 일석이조!", "hashtags": ["일본", "출장", "맛집"]},
    # taemin
    {"author": "taemin", "content": "시리즈A 투자 유치 성공!! 팀원들 정말 고생했다. 이제 시작이야", "hashtags": ["스타트업", "투자", "창업"]},
    {"author": "taemin", "content": "피칭 덱 50번째 수정 중.. 투자자들 앞에서 발표할 생각하니 떨린다", "hashtags": ["스타트업", "피칭", "비즈니스"]},
    {"author": "taemin", "content": "개발팀 야근하면서 피자 시켜 먹는 이 순간이 스타트업의 낭만이지", "hashtags": ["스타트업", "개발", "야근"]},
    {"author": "taemin", "content": "CES 다녀왔는데 기술 트렌드가 빠르게 변하고 있다.. 우리도 적응해야지", "hashtags": ["기술", "CES", "혁신"]},
    # chaeyoung
    {"author": "chaeyoung", "content": "쇼팽 발라드 연습 중.. 이 곡은 연습할수록 새로운 감정이 느껴져", "hashtags": ["피아노", "클래식", "쇼팽"]},
    {"author": "chaeyoung", "content": "재즈 잼 세션 다녀왔는데 즉흥 연주의 매력에 빠졌다!", "hashtags": ["재즈", "피아노", "음악"]},
    {"author": "chaeyoung", "content": "첫 독주회 끝! 떨려서 손이 떨렸지만 마지막 곡에서 울컥했어요", "hashtags": ["피아노", "독주회", "음악"]},
    {"author": "chaeyoung", "content": "음악은 말로 표현할 수 없는 감정을 전달하는 유일한 언어인 것 같아", "hashtags": ["음악", "피아노", "감성"]},
]

# Generate follow relationships - create a well-connected social graph
FOLLOW_PAIRS = [
    ("jimin", "subin"), ("jimin", "eunji"), ("jimin", "minji"), ("jimin", "yuna"), ("jimin", "chanwoo"), ("jimin", "woojin"),
    ("subin", "jimin"), ("subin", "eunji"), ("subin", "dongho"), ("subin", "soojin"), ("subin", "nayeon"),
    ("minjun", "hyunwoo"), ("minjun", "minji"), ("minjun", "jimin"), ("minjun", "jihoon"), ("minjun", "taemin"),
    ("yuna", "jimin"), ("yuna", "taehyung"), ("yuna", "soyeon"), ("yuna", "minji"), ("yuna", "chaeyoung"), ("yuna", "arin"),
    ("dongho", "subin"), ("dongho", "minjun"), ("dongho", "jimin"), ("dongho", "jungwon"), ("dongho", "nayeon"),
    ("soyeon", "yuna"), ("soyeon", "jimin"), ("soyeon", "eunji"), ("soyeon", "seojin"), ("soyeon", "yerin"),
    ("hyunwoo", "minjun"), ("hyunwoo", "dongho"), ("hyunwoo", "sunwoo"), ("hyunwoo", "taemin"), ("hyunwoo", "jihoon"),
    ("eunji", "jimin"), ("eunji", "subin"), ("eunji", "soyeon"), ("eunji", "taehyung"), ("eunji", "gunwoo"), ("eunji", "hayoung"),
    ("taehyung", "yuna"), ("taehyung", "jimin"), ("taehyung", "eunji"), ("taehyung", "chaeyoung"), ("taehyung", "arin"),
    ("minji", "jimin"), ("minji", "yuna"), ("minji", "minjun"), ("minji", "hyunwoo"), ("minji", "hayoung"),
    ("jihoon", "minjun"), ("jihoon", "hyunwoo"), ("jihoon", "taemin"), ("jihoon", "seojin"),
    ("hayoung", "minji"), ("hayoung", "jimin"), ("hayoung", "eunji"), ("hayoung", "soojin"), ("hayoung", "dahyun"),
    ("seojin", "soyeon"), ("seojin", "taehyung"), ("seojin", "chaeyoung"), ("seojin", "yuna"), ("seojin", "arin"),
    ("woojin", "jimin"), ("woojin", "subin"), ("woojin", "nayeon"), ("woojin", "soojin"), ("woojin", "dahyun"),
    ("nayeon", "dongho"), ("nayeon", "soyeon"), ("nayeon", "dahyun"), ("nayeon", "woojin"), ("nayeon", "yuna"),
    ("chanwoo", "jimin"), ("chanwoo", "yuna"), ("chanwoo", "sunwoo"), ("chanwoo", "gunwoo"), ("chanwoo", "minji"),
    ("soojin", "subin"), ("soojin", "woojin"), ("soojin", "nayeon"), ("soojin", "hayoung"), ("soojin", "dahyun"),
    ("jungwon", "dongho"), ("jungwon", "minjun"), ("jungwon", "gunwoo"), ("jungwon", "taemin"),
    ("dahyun", "nayeon"), ("dahyun", "soojin"), ("dahyun", "hayoung"), ("dahyun", "woojin"), ("dahyun", "yuna"),
    ("sunwoo", "hyunwoo"), ("sunwoo", "chanwoo"), ("sunwoo", "soyeon"), ("sunwoo", "minjun"),
    ("arin", "yuna"), ("arin", "taehyung"), ("arin", "chaeyoung"), ("arin", "soyeon"), ("arin", "seojin"),
    ("gunwoo", "dongho"), ("gunwoo", "chanwoo"), ("gunwoo", "eunji"), ("gunwoo", "jungwon"), ("gunwoo", "sunwoo"),
    ("yerin", "soyeon"), ("yerin", "eunji"), ("yerin", "seojin"), ("yerin", "jimin"), ("yerin", "minji"),
    ("taemin", "minjun"), ("taemin", "hyunwoo"), ("taemin", "jihoon"), ("taemin", "minji"), ("taemin", "jimin"),
    ("chaeyoung", "taehyung"), ("chaeyoung", "yuna"), ("chaeyoung", "arin"), ("chaeyoung", "soyeon"), ("chaeyoung", "seojin"),
]

COMMENTS_DATA = [
    {"post_idx": 0, "commenter": "subin", "content": "오 어디야?? 나도 가보고 싶다!"},
    {"post_idx": 0, "commenter": "eunji", "content": "성수동 카페 진짜 많아졌더라 ㅎㅎ"},
    {"post_idx": 4, "commenter": "jimin", "content": "을지로 맛집 리스트 공유해줘!!"},
    {"post_idx": 4, "commenter": "eunji", "content": "거기 나도 가봤어! 진짜 맛있지"},
    {"post_idx": 6, "commenter": "dongho", "content": "제주도 흑돼지 어디서 먹었어? 궁금하다"},
    {"post_idx": 8, "commenter": "hyunwoo", "content": "오 대박! 어떤 스택 썼어?"},
    {"post_idx": 8, "commenter": "minji", "content": "나도 React 공부 중인데 같이 해요!"},
    {"post_idx": 12, "commenter": "minji", "content": "와 너무 예쁘다!! 수채화 감성 최고"},
    {"post_idx": 12, "commenter": "taehyung", "content": "앨범 커버로 쓰고 싶을 정도 ㅋㅋ"},
    {"post_idx": 16, "commenter": "minjun", "content": "180kg?? 미쳤다 진짜 대단해"},
    {"post_idx": 20, "commenter": "yuna", "content": "하루키 나도 좋아해! 뭐 읽고 있어?"},
    {"post_idx": 24, "commenter": "minjun", "content": "Attention is All You Need 논문이죠? 저도 읽었어요!"},
    {"post_idx": 28, "commenter": "jimin", "content": "양양 서핑 나도 가보고 싶었는데! 초보도 가능해?"},
    {"post_idx": 32, "commenter": "yuna", "content": "들어보고 싶다! 어디서 들을 수 있어?"},
    {"post_idx": 36, "commenter": "yuna", "content": "깔끔하다! 포트폴리오에 넣어도 되겠다"},
    {"post_idx": 40, "commenter": "minjun", "content": "인디게임 장르가 뭐야? 관심 있어!"},
    {"post_idx": 40, "commenter": "jihoon", "content": "곧 스팀 올라가면 위시리스트 부탁해요!"},
    {"post_idx": 44, "commenter": "minji", "content": "코디 진짜 예쁘다! 자켓 어디 거야?"},
    {"post_idx": 48, "commenter": "taehyung", "content": "듄 IMAX로 봐야 하는 영화지 진짜"},
    {"post_idx": 52, "commenter": "jimin", "content": "에티오피아 원두 좋아하는데 카페 어디예요?"},
    {"post_idx": 56, "commenter": "dongho", "content": "요가 시작해보고 싶은데 초보도 가능해요?"},
    {"post_idx": 60, "commenter": "jimin", "content": "서울 스카이라인 진짜 멋있다!! 어디서 찍은 거야?"},
    {"post_idx": 64, "commenter": "subin", "content": "마카롱 맛보고 싶어!! 주문 가능해?"},
    {"post_idx": 68, "commenter": "dongho", "content": "풋살 같이 하자! 다음 주 가능?"},
    {"post_idx": 72, "commenter": "nayeon", "content": "몬스테라 예쁘다!! 물 얼마나 자주 줘?"},
    {"post_idx": 76, "commenter": "chanwoo", "content": "유성우 사진 찍으면 공유해줘!!"},
    {"post_idx": 80, "commenter": "taehyung", "content": "오디션 응원해!! 넌 잘 할 수 있어"},
    {"post_idx": 84, "commenter": "dongho", "content": "서울-부산 대단하다!! 나도 도전해볼까"},
    {"post_idx": 88, "commenter": "soyeon", "content": "JLPT N1 축하해!! 비법이 뭐야?"},
    {"post_idx": 92, "commenter": "hyunwoo", "content": "투자 유치 축하합니다!! 대박 나세요"},
    {"post_idx": 96, "commenter": "yuna", "content": "쇼팽 발라드 몇 번이야? 나도 좋아해!"},
]

REPLIES_DATA = [
    {"comment_idx": 0, "replier": "jimin", "content": "성수동 뚝섬역 근처야! DM 줘 위치 알려줄게"},
    {"comment_idx": 2, "replier": "subin", "content": "인스타에 올려놨어 확인해봐 ㅎㅎ"},
    {"comment_idx": 5, "replier": "minjun", "content": "React + FastAPI + TypeScript 썼어! 추천!"},
    {"comment_idx": 8, "replier": "yuna", "content": "ㅋㅋㅋ 고마워! 작업 의뢰는 DM으로~"},
    {"comment_idx": 12, "replier": "eunji", "content": "초보도 강습 받으면 바로 탈 수 있어! 같이 가자"},
    {"comment_idx": 19, "replier": "woojin", "content": "성수동이에요! 주말에 오시면 직접 내려드릴게요"},
    {"comment_idx": 20, "replier": "nayeon", "content": "완전 가능! 초보 클래스 따로 있어요 ㅎㅎ"},
    {"comment_idx": 22, "replier": "soojin", "content": "네! 인스타 DM으로 주문 받고 있어요~"},
    {"comment_idx": 24, "replier": "dahyun", "content": "일주일에 한 번 정도! 과습 조심해야 해요"},
    {"comment_idx": 28, "replier": "yerin", "content": "매일 꾸준히 공부한 게 비법이에요! 화이팅!"},
]


def seed():
    random.seed(42)
    base_time = time.time() - 86400 * 3  # 3일 전부터 시작

    # Create users
    users = {}
    for i, u in enumerate(USERS_DATA):
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            username=u["username"],
            bio=u["bio"],
            interests=u["interests"],
            following=[],
            followers=[],
            post_ids=[],
            created_at=base_time + i * 100,
        )
        users[u["username"]] = user
        user_store.set(u["username"], user)
        search_trie.insert(u["username"])
        social_graph.add_node(user_id)

    # Create follow relationships
    for follower_name, target_name in FOLLOW_PAIRS:
        follower = users[follower_name]
        target = users[target_name]
        if target.id not in follower.following:
            follower.following.append(target.id)
            target.followers.append(follower.id)
            social_graph.add_edge(follower.id, target.id)

    # Create posts
    post_objects = []
    for i, p in enumerate(POSTS_DATA):
        post_id = str(uuid.uuid4())
        author = users[p["author"]]
        created_at = base_time + 2000 + i * 900  # 15분 간격

        post = Post(
            id=post_id,
            author_id=author.id,
            content=p["content"],
            hashtags=p["hashtags"],
            likes=random.randint(1, 40),
            comment_ids=[],
            created_at=created_at,
        )

        post_store.set(post_id, post)
        feed_tree.insert((created_at, post_id))
        author.post_ids.append(post_id)
        post_objects.append(post)

        for t in p["hashtags"]:
            if t not in tag_index:
                tag_index[t] = set()
            tag_index[t].add(post_id)

    # Create comments
    comment_objects = []
    for c in COMMENTS_DATA:
        if c["post_idx"] >= len(post_objects):
            continue
        post = post_objects[c["post_idx"]]
        commenter = users[c["commenter"]]
        comment_id = str(uuid.uuid4())

        comment = Comment(
            id=comment_id,
            post_id=post.id,
            author_id=commenter.id,
            content=c["content"],
            parent_id=None,
            children=[],
            created_at=post.created_at + random.randint(300, 3600),
        )
        comment_store.set(comment_id, comment)
        post.comment_ids.append(comment_id)
        comment_objects.append(comment)

    # Create replies
    for r in REPLIES_DATA:
        if r["comment_idx"] >= len(comment_objects):
            continue
        parent = comment_objects[r["comment_idx"]]
        replier = users[r["replier"]]
        reply_id = str(uuid.uuid4())

        reply = Comment(
            id=reply_id,
            post_id=parent.post_id,
            author_id=replier.id,
            content=r["content"],
            parent_id=parent.id,
            children=[],
            created_at=parent.created_at + random.randint(120, 1800),
        )
        comment_store.set(reply_id, reply)
        parent.children.append(reply_id)

    print(f"Seeded {len(USERS_DATA)} users, {len(post_objects)} posts, "
          f"{len(FOLLOW_PAIRS)} follows, {len(comment_objects)} comments")


if __name__ == "__main__":
    seed()
