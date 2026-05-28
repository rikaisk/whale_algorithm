import { useState } from "react";
import type { Post } from "../api/client";
import { recommendPosts, recommendPeople, recommendPath } from "../api/client";
import PostCard from "../components/PostCard";

export default function RecommendPage({ username, userId }: { username: string; userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [people, setPeople] = useState<{ user_id: string; username: string; common_friends: number }[]>([]);
  const [pathFrom, setPathFrom] = useState("");
  const [pathTo, setPathTo] = useState(username);
  const [path, setPath] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "people" | "path">("posts");

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await recommendPosts(username);
      setPosts(res.results);
      setInterests(res.interests_used);
    } finally {
      setLoading(false);
    }
  };

  const loadPeople = async () => {
    setLoading(true);
    try {
      const res = await recommendPeople(username);
      setPeople(res);
    } finally {
      setLoading(false);
    }
  };

  const findPath = async () => {
    if (!pathFrom.trim() || !pathTo.trim()) return;
    setLoading(true);
    try {
      const res = await recommendPath(pathFrom, pathTo);
      setPath(res.path);
    } catch {
      setPath([]);
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: "6px 16px",
    cursor: "pointer",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid #1a73e8" : "2px solid transparent",
    background: "transparent",
    fontWeight: activeTab === tab ? 700 : 400,
    color: activeTab === tab ? "#1a73e8" : "#555",
  });

  return (
    <div>
      <h2>추천</h2>
      <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: 16 }}>
        <button style={tabStyle("posts")} onClick={() => { setActiveTab("posts"); loadPosts(); }}>게시글 추천</button>
        <button style={tabStyle("people")} onClick={() => { setActiveTab("people"); loadPeople(); }}>사람 추천</button>
        <button style={tabStyle("path")} onClick={() => setActiveTab("path")}>인맥 경로</button>
      </div>

      {activeTab === "posts" && (
        <div>
          {interests.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: "#888", fontSize: 13 }}>분석된 관심사: </span>
              {interests.map((t) => (
                <span key={t} style={{ background: "#e8f5e9", color: "#2e7d32", borderRadius: 12, padding: "2px 8px", marginRight: 4, fontSize: 12 }}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {loading ? <p>분석 중...</p> : posts.length === 0 ? (
            <p style={{ color: "#888" }}>버튼을 눌러 추천 게시글을 불러오세요.</p>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} currentUserId={userId} />)
          )}
        </div>
      )}

      {activeTab === "people" && (
        <div>
          {loading ? <p>분석 중...</p> : people.length === 0 ? (
            <p style={{ color: "#888" }}>추천할 사람이 없습니다.</p>
          ) : (
            people.map((u) => (
              <div key={u.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid #eee", borderRadius: 6, marginBottom: 8, background: "#fff" }}>
                <div>
                  <b>@{u.username}</b>
                  <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>공통 친구 {u.common_friends}명</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "path" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              value={pathFrom}
              onChange={(e) => setPathFrom(e.target.value)}
              placeholder="출발 유저명"
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", flex: 1 }}
            />
            <input
              value={pathTo}
              onChange={(e) => setPathTo(e.target.value)}
              placeholder="도착 유저명"
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", flex: 1 }}
            />
            <button
              onClick={findPath}
              disabled={loading}
              style={{ padding: "6px 14px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              경로 찾기
            </button>
          </div>
          {path !== null && (
            path.length === 0 ? (
              <p style={{ color: "#c00" }}>경로를 찾을 수 없습니다.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {path.map((u, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ padding: "4px 10px", background: "#e8f0fe", borderRadius: 16, color: "#1a73e8" }}>@{u}</span>
                    {i < path.length - 1 && <span style={{ color: "#888" }}>→</span>}
                  </span>
                ))}
                <span style={{ color: "#888", fontSize: 13 }}>({path.length - 1}촌)</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
