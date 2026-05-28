import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { recommendPosts, recommendPeople, findPath, followUser } from "../api";

interface Props {
  currentUser: string;
}

interface RecPost {
  id: string;
  author_username: string;
  content: string;
  hashtags: string[];
  likes: number;
  score: number;
  created_at: number;
}

interface RecPerson {
  user_id: string;
  username: string;
  bio: string;
  common_friends: number;
}

export default function RecommendPage({ currentUser }: Props) {
  const { username } = useParams<{ username: string }>();
  const [tab, setTab] = useState<"posts" | "people" | "path">("posts");
  const [recPosts, setRecPosts] = useState<RecPost[]>([]);
  const [recPeople, setRecPeople] = useState<RecPerson[]>([]);
  const [pathTarget, setPathTarget] = useState("");
  const [pathResult, setPathResult] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (username && tab === "posts") loadRecPosts();
    if (username && tab === "people") loadRecPeople();
  }, [username, tab]);

  const loadRecPosts = async () => {
    setLoading(true);
    try {
      const data = await recommendPosts(username!);
      setRecPosts(data);
    } catch {}
    setLoading(false);
  };

  const loadRecPeople = async () => {
    setLoading(true);
    try {
      const data = await recommendPeople(username!);
      setRecPeople(data);
    } catch {}
    setLoading(false);
  };

  const handleFindPath = async () => {
    if (!pathTarget.trim()) return;
    setLoading(true);
    try {
      const data = await findPath(username!, pathTarget);
      setPathResult(data.path);
    } catch {
      setPathResult([]);
    }
    setLoading(false);
  };

  const handleFollow = async (target: string) => {
    try {
      await followUser(currentUser, target);
      loadRecPeople();
    } catch {}
  };

  return (
    <div>
      <h1 className="page-title">Recommendations</h1>

      <div className="tabs">
        <button className={`tab ${tab === "posts" ? "active" : ""}`} onClick={() => setTab("posts")}>
          Posts (Heap)
        </button>
        <button className={`tab ${tab === "people" ? "active" : ""}`} onClick={() => setTab("people")}>
          People (BFS)
        </button>
        <button className={`tab ${tab === "path" ? "active" : ""}`} onClick={() => setTab("path")}>
          Path (Dijkstra)
        </button>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {!loading && tab === "posts" && (
        <div>
          {recPosts.length === 0 ? (
            <div className="empty">No recommendations yet. Create posts and follow users!</div>
          ) : (
            recPosts.map((post) => (
              <Link to={`/post/${post.id}`} key={post.id} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="post-card">
                  <div className="post-header">
                    <span className="post-author">{post.author_username}</span>
                    <span className="post-time">Score: {post.score}</span>
                  </div>
                  <p className="post-content">{post.content}</p>
                  <div className="post-tags">
                    {post.hashtags.map((tag) => (
                      <span key={tag} className="tag">#{tag}</span>
                    ))}
                  </div>
                  <div className="post-footer">
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Likes: {post.likes}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {!loading && tab === "people" && (
        <div>
          {recPeople.length === 0 ? (
            <div className="empty">No people recommendations yet. Follow more users!</div>
          ) : (
            recPeople.map((person) => (
              <div className="card" key={person.user_id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <Link to={`/profile/${person.username}`} className="post-author">
                      {person.username}
                    </Link>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0.25rem 0" }}>
                      {person.bio}
                    </p>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Common friends: {person.common_friends}
                    </span>
                  </div>
                  <button className="btn" onClick={() => handleFollow(person.username)}>
                    Follow
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === "path" && (
        <div>
          <div className="card">
            <div className="form-group">
              <label>Find connection path to:</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={pathTarget}
                  onChange={(e) => setPathTarget(e.target.value)}
                  placeholder="Target username"
                  onKeyDown={(e) => e.key === "Enter" && handleFindPath()}
                />
                <button className="btn" onClick={handleFindPath}>Find</button>
              </div>
            </div>
          </div>

          {pathResult.length > 0 && (
            <div className="card">
              <strong>Connection path ({pathResult.length - 1} hops):</strong>
              <div className="path-display">
                {pathResult.map((name, i) => (
                  <span key={i}>
                    <Link to={`/profile/${name}`} className="path-node">{name}</Link>
                    {i < pathResult.length - 1 && <span className="path-arrow"> → </span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pathResult.length === 0 && pathTarget && (
            <div className="empty">No connection path found</div>
          )}
        </div>
      )}
    </div>
  );
}
