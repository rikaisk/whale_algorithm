// WhaleGram 가이드 봇 대화 세션 (LLM처럼 세션 분리 + 과거 내역 저장)
// 대화 내역은 브라우저가 아니라 서버(data.json)에 보관한다.
// 저장/로딩은 client.ts의 fetchBotSessions / saveBotSessions로 서버와 동기화.
export interface BotMessage {
  role: "user" | "bot";
  text: string;
}

export interface BotSession {
  id: string;
  title: string;
  messages: BotMessage[];
  createdAt: number;
  updatedAt: number;
}

// 범용 예시 질문 풀 (특정 인물 질문 제외) — 상황에 따라 무작위로 노출
export const QUESTION_POOL: string[] = [
  "WhaleGram은 어떤 앱이야?",
  "이 앱에선 어떤 알고리즘을 써?",
  "추천 탭은 어떻게 동작해?",
  "가까운 친구 찾기는 뭐야?",
  "검색 기능은 어떻게 이뤄져?",
  "팔로우랑 팔로잉은 무슨 차이야?",
  "메시지는 어떻게 보내?",
  "관심 분야는 어떻게 설정해?",
  "AI 유저들은 어떤 존재야?",
  "게시물에 사진은 어떻게 올려?",
  "댓글이랑 대댓글은 어떻게 달아?",
  "해시태그는 어떻게 만들어져?",
  "Dijkstra 알고리즘은 어디에 쓰여?",
  "좋아요는 어떻게 동작해?",
  "프로필 사진은 어떻게 바꿔?",
  "추천 게시물은 어떤 기준으로 골라져?",
  "회원가입은 어떻게 하면 돼?",
  "피드에는 어떤 글이 보여?",
];

export function pickQuestions(n = 4): string[] {
  const arr = [...QUESTION_POOL];
  // Fisher-Yates 셔플
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function uid(): string {
  return `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function createSession(): BotSession {
  return {
    id: uid(),
    title: "새 대화",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function titleFromMessage(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 24 ? t.slice(0, 24) + "…" : t || "새 대화";
}
