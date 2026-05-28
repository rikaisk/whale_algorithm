import { useState, useEffect } from "react";
import { getFeed, createPost, deletePost, Post } from "../api/client";
import PostCard from "../components/PostCard";

export default function FeedPage({ username, userId }: { username: string; userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await getFeed(username);
      setPosts(data);
    } catch {
      setError("피드를 불러오지 못했습니다.");
    }
  };

  useEffect(() => { load(); }, [username]);

  const submit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await createPost(username, content);
      setContent("");
      await load();
    } catch {
      setError("게시글 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (post_id: string) => {
    await deletePost(post_id);
    setPosts((prev) => prev.filter((p) => p.id !== post_id));
  };

  return (
    <div>
      <h2>피드</h2>
      <div style={{ marginBottom: 16 }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          style={{ width: "100%", padding: 8, boxSizing: "border-box", borderRadius: 6, border: "1px solid #ccc" }}
          placeholder="무슨 생각을 하고 계신가요?"
        />
        <button
          onClick={submit}
          disabled={loading}
          style={{ marginTop: 6, padding: "6px 16px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          {loading ? "게시 중..." : "게시"}
        </button>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {posts.length === 0 ? (
        <p style={{ color: "#888" }}>팔로우한 사람의 게시글이 여기에 표시됩니다.</p>
      ) : (
        posts.map((p) => (
          <PostCard key={p.id} post={p} currentUserId={userId} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}
