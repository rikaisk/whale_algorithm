import { useState } from "react";
import type { Post } from "../api/client";
import { searchUsers, searchPosts, expandSearch } from "../api/client";
import PostCard from "../components/PostCard";

export default function SearchPage({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState<string[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "posts" | "expand">("posts");
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (activeTab === "users") {
        const res = await searchUsers(query);
        setUserResults(res.results);
        setPostResults([]);
        setExpanded([]);
      } else if (activeTab === "posts") {
        const res = await searchPosts(query);
        setPostResults(res.results);
        setUserResults([]);
        setExpanded([]);
      } else {
        const res = await expandSearch(query);
        setPostResults(res.results);
        setExpanded(res.expanded_keywords);
        setUserResults([]);
      }
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
      <h2>검색</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="검색어를 입력하세요"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          onClick={search}
          disabled={loading}
          style={{ padding: "8px 16px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          {loading ? "..." : "검색"}
        </button>
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: 16 }}>
        <button style={tabStyle("posts")} onClick={() => setActiveTab("posts")}>게시글 검색</button>
        <button style={tabStyle("users")} onClick={() => setActiveTab("users")}>유저 검색</button>
        <button style={tabStyle("expand")} onClick={() => setActiveTab("expand")}>AI 키워드 확장</button>
      </div>

      {expanded.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: "#888", fontSize: 13 }}>확장 키워드: </span>
          {expanded.map((kw) => (
            <span key={kw} style={{ background: "#fce8b2", borderRadius: 12, padding: "2px 8px", marginRight: 4, fontSize: 12 }}>
              {kw}
            </span>
          ))}
        </div>
      )}

      {userResults.map((u) => (
        <div key={u} style={{ padding: "8px 12px", border: "1px solid #eee", borderRadius: 6, marginBottom: 6, background: "#fff" }}>
          @{u}
        </div>
      ))}

      {postResults.map((p) => (
        <PostCard key={p.id} post={p} currentUserId={currentUserId} />
      ))}

      {userResults.length === 0 && postResults.length === 0 && query && !loading && (
        <p style={{ color: "#888" }}>검색 결과가 없습니다.</p>
      )}
    </div>
  );
}
