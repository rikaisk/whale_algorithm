import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getFeed, getAllPosts, createPost, likePost } from "../api";

interface Props {
  currentUser: string;
}

interface PostData {
  id: string;
  author_id: string;
  author_username: string;
  content: string;
  hashtags: string[];
  likes: number;
  created_at: number;
}

export default function FeedPage({ currentUser }: Props) {
  const { username } = useParams<{ username: string }>();
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [allPosts, setAllPosts] = useState<PostData[]>([]);
  const [followingPosts, setFollowingPosts] = useState<PostData[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (username) loadAll();
  }, [username]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [allData, feedData] = await Promise.all([
        getAllPosts().catch(() => []),
        getFeed(username!).catch(() => []),
      ]);
      setAllPosts(allData);
      setFollowingPosts(feedData);
    } catch {}
    setLoading(false);
  };

  const handlePost = async () => {
    if (!content.trim() || !currentUser) return;
    setPosting(true);
    try {
      await createPost(currentUser, content);
      setContent("");
      loadAll();
    } catch {}
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    try {
      await likePost(postId);
      loadAll();
    } catch {}
  };

  const renderPost = (post: PostData) => (
    <div className="post-card" key={post.id}>
      <div className="post-header">
        <Link to={`/profile/${post.author_username}`} className="post-author">
          {post.author_username}
        </Link>
        <span className="post-time">
          {new Date(post.created_at * 1000).toLocaleString()}
        </span>
      </div>
      <Link to={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <p className="post-content">{post.content}</p>
      </Link>
      <div className="post-tags">
        {post.hashtags.map((tag) => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>
      <div className="post-footer">
        <button className="btn-like" onClick={() => handleLike(post.id)}>
          Like ({post.likes})
        </button>
        <Link to={`/post/${post.id}`} className="btn-sm">Comments</Link>
      </div>
    </div>
  );

  const currentPosts = tab === "foryou" ? allPosts : followingPosts;

  return (
    <div>
      <h1 className="page-title">Feed</h1>

      {currentUser && (
        <div className="card">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
          />
          <button
            className="btn"
            style={{ marginTop: "0.75rem" }}
            onClick={handlePost}
            disabled={posting || !content.trim()}
          >
            {posting ? "Posting..." : "Post"}
          </button>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === "foryou" ? "active" : ""}`} onClick={() => setTab("foryou")}>
          For You
        </button>
        <button className={`tab ${tab === "following" ? "active" : ""}`} onClick={() => setTab("following")}>
          Following
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : currentPosts.length === 0 ? (
        <div className="empty">
          {tab === "following"
            ? "No posts from people you follow yet. Follow some users!"
            : "No posts yet. Be the first to create one!"}
        </div>
      ) : (
        currentPosts.map((post) => renderPost(post))
      )}
    </div>
  );
}
