// 최근 검색 기록 — 브라우저가 아니라 서버(data.json)에 보관.
// 이 모듈은 배열을 다루는 순수 함수만 제공하고, 실제 저장/로딩은
// client.ts의 fetchSearchHistory / saveSearchHistory로 서버와 동기화한다.
export type UserHistory = { type: "user"; username: string; ts: number };
export type PostHistory = {
  type: "post";
  postId: string;
  preview: string;
  authorUsername?: string;
  ts: number;
};
export type HistoryItem = UserHistory | PostHistory;

export type HistoryInput =
  | { type: "user"; username: string }
  | { type: "post"; postId: string; preview: string; authorUsername?: string };

const MAX = 12;

export function pushHistory(list: HistoryItem[], item: HistoryInput): HistoryItem[] {
  const filtered = list.filter((h) => {
    if (item.type === "user" && h.type === "user") return h.username !== item.username;
    if (item.type === "post" && h.type === "post") return h.postId !== item.postId;
    return true;
  });
  const entry: HistoryItem = { ...item, ts: Date.now() } as HistoryItem;
  return [entry, ...filtered].slice(0, MAX);
}

export function removeFromHistory(
  list: HistoryItem[],
  predicate: (h: HistoryItem) => boolean,
): HistoryItem[] {
  return list.filter((h) => !predicate(h));
}
