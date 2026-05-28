import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

export interface User {
  id: string;
  username: string;
  bio: string;
  interests: string[];
  following_count: number;
  followers_count: number;
  post_count: number;
  created_at: number;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  hashtags: string[];
  likes: number;
  comment_count: number;
  score?: number;
  created_at: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_id: string | null;
  created_at: number;
  replies: Comment[];
}

// Profile
export const registerUser = (username: string, bio: string) =>
  api.post("/users/register", { username, bio }).then((r) => r.data);

export const getProfile = (username: string): Promise<User> =>
  api.get(`/users/${username}`).then((r) => r.data);

export const updateBio = (username: string, bio: string) =>
  api.patch(`/users/${username}/bio`, { bio }).then((r) => r.data);

export const getUserFeed = (username: string): Promise<Post[]> =>
  api.get(`/users/${username}/feed`).then((r) => r.data);

// Posts
export const createPost = (author_username: string, content: string) =>
  api.post("/posts", { author_username, content }).then((r) => r.data);

export const deletePost = (post_id: string) =>
  api.delete(`/posts/${post_id}`);

export const likePost = (post_id: string) =>
  api.post(`/posts/${post_id}/like`).then((r) => r.data);

export const getFeed = (username: string): Promise<Post[]> =>
  api.get(`/feed/${username}`).then((r) => r.data);

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

export const followUser = (username: string, target: string) =>
  api.post(`/users/${username}/follow/${target}`).then((r) => r.data);

export const unfollowUser = (username: string, target: string) =>
  api.delete(`/users/${username}/follow/${target}`);

// Comments
export const getComments = (post_id: string): Promise<Comment[]> =>
  api.get(`/posts/${post_id}/comments`).then((r) => r.data);

export const createComment = (post_id: string, author_id: string, content: string) =>
  api.post(`/posts/${post_id}/comments`, { author_id, content }).then((r) => r.data);

export const createReply = (comment_id: string, author_id: string, content: string) =>
  api.post(`/comments/${comment_id}/replies`, { author_id, content }).then((r) => r.data);

export const deleteComment = (comment_id: string) =>
  api.delete(`/comments/${comment_id}`);
