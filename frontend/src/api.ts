const BASE = "http://localhost:8000";

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// Users
export const registerUser = (username: string, bio: string) =>
  request("/users/register", {
    method: "POST",
    body: JSON.stringify({ username, bio }),
  });

export const getUser = (username: string) => request(`/users/${username}`);

export const updateBio = (username: string, bio: string) =>
  request(`/users/${username}/bio`, {
    method: "PATCH",
    body: JSON.stringify({ bio }),
  });

export const followUser = (username: string, target: string) =>
  request(`/users/${username}/follow/${target}`, { method: "POST" });

export const unfollowUser = (username: string, target: string) =>
  request(`/users/${username}/follow/${target}`, { method: "DELETE" });

// Posts
export const createPost = (author_username: string, content: string) =>
  request("/posts", {
    method: "POST",
    body: JSON.stringify({ author_username, content }),
  });

export const getPost = (postId: string) => request(`/posts/${postId}`);

export const deletePost = (postId: string) =>
  request(`/posts/${postId}`, { method: "DELETE" });

export const likePost = (postId: string) =>
  request(`/posts/${postId}/like`, { method: "POST" });

export const getFeed = (username: string) => request(`/feed/${username}`);

export const getAllPosts = () => request(`/posts/all`);

// Search
export const searchUsers = (q: string) => request(`/search/users?q=${encodeURIComponent(q)}`);

export const searchPosts = (q: string) => request(`/search/posts?q=${encodeURIComponent(q)}`);

export const expandSearch = (q: string) => request(`/search/expand?q=${encodeURIComponent(q)}`);

// Recommend
export const recommendPosts = (username: string) =>
  request(`/recommend/posts/${username}`);

export const recommendPeople = (username: string) =>
  request(`/recommend/people/${username}`);

export const findPath = (from: string, to: string) =>
  request(`/recommend/path/${from}/${to}`);

export const getFriends = (username: string) => request(`/users/${username}/friends`);

// Comments
export const createComment = (postId: string, author_username: string, content: string) =>
  request(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ author_username, content }),
  });

export const createReply = (commentId: string, author_username: string, content: string) =>
  request(`/comments/${commentId}/replies`, {
    method: "POST",
    body: JSON.stringify({ author_username, content }),
  });

export const deleteComment = (commentId: string) =>
  request(`/comments/${commentId}`, { method: "DELETE" });

export const getComments = (postId: string) => request(`/posts/${postId}/comments`);
