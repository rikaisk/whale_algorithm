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

const KEY = "wg_search_history";
const MAX = 12;

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addHistory(item: HistoryInput): void {
  const list = getHistory();
  const filtered = list.filter((h) => {
    if (item.type === "user" && h.type === "user") return h.username !== item.username;
    if (item.type === "post" && h.type === "post") return h.postId !== item.postId;
    return true;
  });
  const entry: HistoryItem = { ...item, ts: Date.now() } as HistoryItem;
  const next = [entry, ...filtered].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function removeHistory(predicate: (h: HistoryItem) => boolean): void {
  const list = getHistory();
  const next = list.filter((h) => !predicate(h));
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
