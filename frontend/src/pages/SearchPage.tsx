import { useState, useEffect, useRef } from "react";
import type { Post } from "../api/client";
import { searchUsers, searchPosts, expandSearch } from "../api/client";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";

type Tab = "posts" | "users" | "expand";

export default function SearchPage({
  currentUserId,
  currentUsername,
  currentAvatar,
  onOpenProfile,
}: {
  currentUserId: string;
  currentUsername?: string;
  currentAvatar?: string | null;
  onOpenProfile?: (username: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState<string[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeTab !== "users") return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setUserResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await searchUsers(q);
        setUserResults(res.results || []);
        setSearched(true);
      } catch {
        setUserResults([]);
      }
    }, 150);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, activeTab]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setUserResults([]);
    setPostResults([]);
    setExpanded([]);
    try {
      if (activeTab === "users") {
        const res = await searchUsers(query);
        setUserResults(res.results);
      } else if (activeTab === "posts") {
        const res = await searchPosts(query);
        setPostResults(res.results);
      } else {
        const res = await expandSearch(query);
        setPostResults(res.results);
        setExpanded(res.expanded_keywords);
      }
    } finally {
      setLoading(false);
    }
  };

  const tabBtn = (id: Tab, label: string) => {
    const active = activeTab === id;
    return (
      <button
        onClick={() => {
          setActiveTab(id);
          setSearched(false);
          setUserResults([]);
          setPostResults([]);
          setExpanded([]);
        }}
        style={{
          padding: "10px 18px",
          borderBottom: active ? "2px solid var(--ig-text)" : "2px solid transparent",
          color: active ? "var(--ig-text)" : "var(--ig-text-muted)",
          fontWeight: active ? 700 : 600,
          fontSize: 13,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div
        className="ig-card"
        style={{ padding: 14, marginBottom: 16 }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fafafa",
              border: "1px solid var(--ig-border)",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            <span style={{ color: "var(--ig-text-muted)" }}>🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="검색어를 입력하세요"
              style={{ flex: 1, border: "none", background: "transparent", fontSize: 14 }}
            />
          </div>
          <button
            className="ig-btn-primary"
            onClick={runSearch}
            disabled={loading || !query.trim()}
            style={{ padding: "9px 18px" }}
          >
            {loading ? "..." : "검색"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--ig-border)",
          marginBottom: 16,
          justifyContent: "center",
          gap: 30,
        }}
      >
        {tabBtn("posts", "게시글")}
        {tabBtn("users", "유저")}
        {tabBtn("expand", "✨ AI 확장")}
      </div>

      {expanded.length > 0 && (
        <div
          className="ig-card ig-fade-in"
          style={{
            padding: 12,
            marginBottom: 14,
            background: "#fff8e1",
            borderColor: "#ffe082",
          }}
        >
          <div style={{ color: "#7d6608", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
            🤖 Solar AI가 확장한 키워드
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {expanded.map((kw) => (
              <span
                key={kw}
                style={{
                  background: "#ffe082",
                  color: "#7d6608",
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeTab === "users" && userResults.length > 0 && (
        <div className="ig-card">
          {userResults.map((u, i) => (
            <button
              key={u}
              onClick={() => onOpenProfile?.(u)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                width: "100%",
                textAlign: "left",
                borderTop: i === 0 ? "none" : "1px solid var(--ig-border-soft)",
              }}
            >
              <Avatar username={u} size={44} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>{u}</div>
            </button>
          ))}
        </div>
      )}

      {(activeTab === "posts" || activeTab === "expand") &&
        postResults.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            currentAvatar={currentAvatar}
            onOpenProfile={onOpenProfile}
          />
        ))}

      {searched &&
        !loading &&
        userResults.length === 0 &&
        postResults.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ig-text-muted)" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🤷</div>
            <p style={{ margin: 0 }}>검색 결과가 없습니다.</p>
          </div>
        )}
    </div>
  );
}
