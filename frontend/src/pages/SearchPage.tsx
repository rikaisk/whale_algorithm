import { useState } from "react";
import { Link } from "react-router-dom";
import { searchUsers, searchPosts, expandSearch } from "../api";

interface Props {
  currentUser: string;
}

interface PostResult {
  id: string;
  author_username: string;
  content: string;
  hashtags: string[];
  likes: number;
  score?: number;
  created_at: number;
}

export default function SearchPage({ currentUser: _currentUser }: Props) {
  void _currentUser;
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"users" | "posts" | "expand">("users");
  const [userResults, setUserResults] = useState<string[]>([]);
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [expandedKeywords, setExpandedKeywords] = useState<string[]>([]);
  const [expandedResults, setExpandedResults] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (tab === "users") {
        const data = await searchUsers(query);
        setUserResults(data);
      } else if (tab === "posts") {
        const data = await searchPosts(query);
        setPostResults(data);
      } else {
        const data = await expandSearch(query);
        setExpandedKeywords(data.keywords);
        setExpandedResults(data.results);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <h1 className="page-title">Search</h1>

      <div className="search-bar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button className="btn" onClick={handleSearch} disabled={loading}>
          {loading ? "..." : "Search"}
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
          Users (Trie)
        </button>
        <button className={`tab ${tab === "posts" ? "active" : ""}`} onClick={() => setTab("posts")}>
          Posts (KMP)
        </button>
        <button className={`tab ${tab === "expand" ? "active" : ""}`} onClick={() => setTab("expand")}>
          Expand (Solar)
        </button>
      </div>

      {tab === "users" && (
        <div>
          {userResults.length === 0 ? (
            <div className="empty">No users found</div>
          ) : (
            userResults.map((u) => (
              <Link to={`/profile/${u}`} key={u} style={{ textDecoration: "none" }}>
                <div className="card" style={{ cursor: "pointer" }}>
                  <strong>{u}</strong>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "posts" && (
        <div>
          {postResults.length === 0 ? (
            <div className="empty">No posts found</div>
          ) : (
            postResults.map((post) => (
              <Link to={`/post/${post.id}`} key={post.id} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="post-card">
                  <div className="post-header">
                    <span className="post-author">{post.author_username}</span>
                    {post.score !== undefined && (
                      <span className="post-time">Score: {post.score}</span>
                    )}
                  </div>
                  <p className="post-content">{post.content}</p>
                  <div className="post-tags">
                    {post.hashtags.map((tag) => (
                      <span key={tag} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "expand" && (
        <div>
          {expandedKeywords.length > 0 && (
            <div className="card">
              <strong>Related keywords:</strong>
              <div className="post-tags" style={{ marginTop: "0.5rem" }}>
                {expandedKeywords.map((kw) => (
                  <span key={kw} className="tag">{kw}</span>
                ))}
              </div>
            </div>
          )}
          {expandedResults.length === 0 ? (
            <div className="empty">No expanded results</div>
          ) : (
            expandedResults.map((post) => (
              <Link to={`/post/${post.id}`} key={post.id} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="post-card">
                  <div className="post-header">
                    <span className="post-author">{post.author_username}</span>
                  </div>
                  <p className="post-content">{post.content}</p>
                  <div className="post-tags">
                    {post.hashtags.map((tag) => (
                      <span key={tag} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
