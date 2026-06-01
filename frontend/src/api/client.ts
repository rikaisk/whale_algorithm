import axios from "axios";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
});

const TOKEN_KEY = "algosns_token";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  username: string;
  bio: string;
  interests: string[];
  avatar_base64?: string | null;
  is_ai?: boolean;
  following_count: number;
  followers_count: number;
  post_count: number;
  created_at: number;
}

export interface Post {
  id: string;
  author_id: string;
  author_username?: string;
  content: string;
  hashtags: string[];
  likes: number;
  comment_count: number;
  image_base64?: string | null;
  liked_by_me?: boolean;
  score?: number;
  created_at: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_username?: string;
  content: string;
  parent_id: string | null;
  created_at: number;
  replies: Comment[];
}

export interface DmMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string | null;
  created_at: number;
  read: boolean;
}

export interface ConversationSummary {
  peer_id: string;
  peer_username: string;
  last_content: string;
  last_at: number;
  unread?: number;
}

// Auth
export const login = (username: string, password: string) =>
  api.post("/login", { username, password }).then((r) => r.data);

export const logout = () =>
  api.post("/logout").catch(() => undefined).finally(() => clearToken());

export const getMe = (): Promise<{
  id: string;
  username: string;
  bio: string;
  interests: string[];
  avatar_base64?: string | null;
  following: string[];
}> => api.get("/me").then((r) => r.data);

export const getUserPosts = (username: string): Promise<Post[]> =>
  api.get(`/users/${username}/posts`).then((r) => r.data);

export interface UserMini {
  username: string;
  avatar_base64?: string | null;
  is_ai?: boolean;
  bio?: string;
}

export const getFollowers = (username: string): Promise<UserMini[]> =>
  api.get(`/users/${username}/followers`).then((r) => r.data);

export const getFollowing = (username: string): Promise<UserMini[]> =>
  api.get(`/users/${username}/following`).then((r) => r.data);

export const updateAvatar = (username: string, avatar_base64: string | null) =>
  api.patch(`/users/${username}/avatar`, { avatar_base64 }).then((r) => r.data);

export const userExists = async (username: string): Promise<boolean> => {
  try {
    await api.get(`/users/${username}`);
    return true;
  } catch {
    return false;
  }
};

export type BotTurn = { role: "user" | "assistant"; content: string };

export const askChatbot = (
  question: string,
  history: BotTurn[] = [],
): Promise<{ answer: string }> =>
  api.post("/chatbot/ask", { question, history }).then((r) => r.data);

export interface InterestCategory {
  label: string;
  emoji: string;
}

export const getInterestCategories = (): Promise<InterestCategory[]> =>
  api.get("/admin/interest_categories").then((r) => r.data);

// Profile
export const registerUser = (
  username: string,
  password: string,
  interests: string[] = [],
) =>
  api.post("/users/register", { username, password, interests }).then((r) => r.data);

export const getProfile = (username: string): Promise<User> =>
  api.get(`/users/${username}`).then((r) => r.data);

export const updateBio = (username: string, bio: string) =>
  api.patch(`/users/${username}/bio`, { bio }).then((r) => r.data);

// Posts
export const createPost = (content: string, image_base64?: string) =>
  api.post("/posts", { content, image_base64 }).then((r) => r.data);

export const deletePost = (post_id: string) =>
  api.delete(`/posts/${post_id}`);

export const likePost = (
  post_id: string,
): Promise<{ post_id: string; likes: number; liked_by_me: boolean }> =>
  api.post(`/posts/${post_id}/like`).then((r) => r.data);

export const getFeed = (username: string): Promise<Post[]> =>
  api.get(`/feed/${username}`).then((r) => r.data);

export const getPostLikers = (post_id: string): Promise<UserMini[]> =>
  api.get(`/posts/${post_id}/likers`).then((r) => r.data);

// Search
export const searchUsers = (q: string) =>
  api.get("/search/users", { params: { q } }).then((r) => r.data);

export const searchPosts = (q: string): Promise<{ query: string; results: Post[] }> =>
  api.get("/search/posts", { params: { q } }).then((r) => r.data);

export const expandSearch = (q: string) =>
  api.get("/search/expand", { params: { q } }).then((r) => r.data);

// Recommend
export const recommendPosts = (username: string) =>
  api.get(`/recommend/posts/${username}`).then((r) => r.data);

export const recommendPeople = (username: string) =>
  api.get(`/recommend/people/${username}`).then((r) => r.data);

export const recommendPath = (from: string, to: string) =>
  api.get(`/recommend/path/${from}/${to}`).then((r) => r.data);

export interface ClosestPerson {
  user_id: string;
  username: string;
  is_ai: boolean;
  bio: string;
  distance: number;
  hops: number;
  path: string[];
  shared_interests: string[];
}

export const recommendClosest = (
  username: string,
): Promise<{ results: ClosestPerson[] }> =>
  api.get(`/recommend/closest/${username}`).then((r) => r.data);

export const followUser = (username: string, target: string) =>
  api.post(`/users/${username}/follow/${target}`).then((r) => r.data);

export const unfollowUser = (username: string, target: string) =>
  api.delete(`/users/${username}/follow/${target}`);

// Comments
export const getComments = (post_id: string): Promise<Comment[]> =>
  api.get(`/posts/${post_id}/comments`).then((r) => r.data);

export const createComment = (post_id: string, content: string) =>
  api.post(`/posts/${post_id}/comments`, { content }).then((r) => r.data);

export const createReply = (comment_id: string, content: string) =>
  api.post(`/comments/${comment_id}/replies`, { content }).then((r) => r.data);

export const deleteComment = (comment_id: string) =>
  api.delete(`/comments/${comment_id}`);

// Messages (DM)
export const sendMessage = (to_username: string, content: string) =>
  api.post("/messages", { to_username, content }).then((r) => r.data);

export const getConversation = (peer_username: string): Promise<DmMessage[]> =>
  api.get(`/messages/${peer_username}`).then((r) => r.data);

export const listConversations = (): Promise<ConversationSummary[]> =>
  api.get("/messages").then((r) => r.data);

export const getUnreadCount = (): Promise<{ unread: number }> =>
  api.get("/messages/unread_count").then((r) => r.data);

export const markConversationRead = (peer_username: string): Promise<{ read: number }> =>
  api.post(`/messages/${peer_username}/read`).then((r) => r.data);

// 서버에 보관되는 개인 데이터 (검색 기록 / 가이드봇 대화)
export const fetchSearchHistory = (): Promise<any[]> =>
  api.get("/me/search_history").then((r) => r.data.items ?? []);

export const saveSearchHistory = (items: any[]): Promise<void> =>
  api.put("/me/search_history", { items }).then(() => undefined);

export const fetchBotSessions = (): Promise<any[]> =>
  api.get("/me/bot_sessions").then((r) => r.data.items ?? []);

export const saveBotSessions = (items: any[]): Promise<void> =>
  api.put("/me/bot_sessions", { items }).then(() => undefined);

export const openMessageSocket = (token: string): WebSocket => {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);
};
