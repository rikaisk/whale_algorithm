import { useState, useEffect, useRef } from "react";
import type { Post } from "../api/client";
import { searchUsers, searchPosts, askChatbot } from "../api/client";
import { getHistory, addHistory, removeHistory, type HistoryItem } from "../api/searchHistory";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";

type Tab = "all" | "bot";

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <b key={idx} style={{ fontWeight: 800, background: "rgba(0,149,246,0.15)" }}>
        {text.slice(idx, idx + q.length)}
      </b>,
    );
    i = idx + q.length;
  }
  return <>{parts}</>;
}

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
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState<string[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(getHistory());

  // Chatbot
  const [botInput, setBotInput] = useState("");
  const [botMessages, setBotMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [botLoading, setBotLoading] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const botBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tab !== "all") return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setUserResults([]);
      setPostResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const [usersRes, postsRes] = await Promise.all([
          searchUsers(q).catch(() => ({ results: [] })),
          searchPosts(q).catch(() => ({ results: [] })),
        ]);
        setUserResults((usersRes.results || []).slice(0, 8));
        setPostResults(postsRes.results || []);
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, tab]);

  useEffect(() => {
    botBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botMessages]);

  const handleOpenUser = (u: string) => {
    addHistory({ type: "user", username: u });
    setHistory(getHistory());
    onOpenProfile?.(u);
  };

  const askBot = async () => {
    const q = botInput.trim();
    if (!q || botLoading) return;
    setBotMessages((prev) => [...prev, { role: "user", text: q }]);
    setBotInput("");
    setBotLoading(true);
    try {
      const res = await askChatbot(q);
      setBotMessages((prev) => [...prev, { role: "bot", text: res.answer }]);
    } catch {
      setBotMessages((prev) => [
        ...prev,
        { role: "bot", text: "잠시 후 다시 시도해주세요." },
      ]);
    } finally {
      setBotLoading(false);
    }
  };

  const tabBtn = (id: Tab, label: string) => {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        style={{
          padding: "10px 18px",
          borderBottom: active ? "2px solid var(--ig-text)" : "2px solid transparent",
          color: active ? "var(--ig-text)" : "var(--ig-text-muted)",
          fontWeight: active ? 700 : 600,
          fontSize: 13,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--ig-border)",
          marginBottom: 16,
          justifyContent: "center",
          gap: 24,
        }}
      >
        {tabBtn("all", "검색")}
        {tabBtn("bot", "🤖 WhaleGram 가이드 봇")}
      </div>

      {tab === "all" && (
        <>
          <div className="ig-card" style={{ padding: 12, marginBottom: 16 }}>
            <div
              style={{
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
                placeholder="유저나 게시글 검색 (한글/영문)"
                style={{ flex: 1, border: "none", background: "transparent", fontSize: 14 }}
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  style={{ color: "var(--ig-text-muted)", fontSize: 16 }}
                  title="지우기"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {!query.trim() && (
            <div className="ig-card" style={{ padding: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <h4 style={{ margin: 0, fontSize: 14 }}>최근 검색</h4>
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("wg_search_history");
                      setHistory([]);
                    }}
                    style={{ color: "var(--ig-accent)", fontSize: 12, fontWeight: 600 }}
                  >
                    모두 지우기
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p style={{ color: "var(--ig-text-muted)", fontSize: 13, textAlign: "center", padding: 16 }}>
                  최근 검색 기록이 없습니다.
                </p>
              ) : (
                history.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 4px",
                      borderTop: i === 0 ? "none" : "1px solid var(--ig-border-soft)",
                    }}
                  >
                    {h.type === "user" ? (
                      <>
                        <Avatar username={h.username} size={36} />
                        <button
                          onClick={() => handleOpenUser(h.username)}
                          style={{
                            flex: 1,
                            textAlign: "left",
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {h.username}
                        </button>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            background: "#efefef",
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          📝
                        </div>
                        <button
                          style={{
                            flex: 1,
                            textAlign: "left",
                            fontSize: 13,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h.authorUsername && (
                            <b style={{ marginRight: 6 }}>{h.authorUsername}</b>
                          )}
                          <span style={{ color: "var(--ig-text-muted)" }}>{h.preview}</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        removeHistory((x) => x.ts === h.ts);
                        setHistory(getHistory());
                      }}
                      style={{ color: "var(--ig-text-muted)", fontSize: 16, padding: "0 4px" }}
                      title="제거"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {query.trim() && (
            <>
              {loading && (
                <p style={{ textAlign: "center", color: "var(--ig-text-muted)", padding: 12 }}>
                  검색 중...
                </p>
              )}

              {userResults.length > 0 && (
                <div className="ig-card" style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--ig-border-soft)",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    유저
                  </div>
                  {userResults.map((u, i) => (
                    <button
                      key={u}
                      onClick={() => handleOpenUser(u)}
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
                      <Avatar username={u} size={40} />
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        <HighlightedText text={u} query={query} />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {postResults.length > 0 && (
                <>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--ig-text-muted)",
                      padding: "0 4px 8px",
                    }}
                  >
                    게시글
                  </div>
                  {postResults.map((p) => (
                    <div
                      key={p.id}
                      onMouseDown={() => {
                        addHistory({
                          type: "post",
                          postId: p.id,
                          preview: p.content.slice(0, 40),
                          authorUsername: p.author_username,
                        });
                        setHistory(getHistory());
                      }}
                    >
                      <PostCard
                        post={p}
                        currentUserId={currentUserId}
                        currentUsername={currentUsername}
                        currentAvatar={currentAvatar}
                        onOpenProfile={onOpenProfile}
                      />
                    </div>
                  ))}
                </>
              )}

              {!loading && userResults.length === 0 && postResults.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "var(--ig-text-muted)" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🤷</div>
                  <p style={{ margin: 0 }}>"{query}" 검색 결과가 없습니다.</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === "bot" && (
        <div
          className="ig-card"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 180px)",
            minHeight: 480,
            maxHeight: 720,
            overflow: "hidden",
          }}
        >
          <header
            style={{
              padding: 14,
              borderBottom: "1px solid var(--ig-border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "linear-gradient(135deg, #4f5bd5 0%, #962fbf 100%)",
              color: "#fff",
            }}
          >
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>WhaleGram 가이드 봇</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>
                AI 유저, 앱 기능, 알고리즘에 대해 물어보세요
              </div>
            </div>
          </header>
          <div
            className="ig-scrollbar"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "#fafafa",
            }}
          >
            {botMessages.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--ig-text-muted)", padding: 20 }}>
                <p style={{ fontSize: 13, margin: "0 0 12px" }}>예시 질문:</p>
                {[
                  "WhaleGram이 뭐야?",
                  "yuna는 어떤 사람이야?",
                  "이 앱에서 어떤 알고리즘을 써?",
                  "팔로우는 어떻게 해?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setBotInput(q)}
                    className="ig-chip"
                    style={{ margin: 4, cursor: "pointer", fontSize: 12 }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {botMessages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "8px 14px",
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.5,
                    background:
                      m.role === "user"
                        ? "linear-gradient(135deg, #4f5bd5 0%, #962fbf 50%, #d62976 100%)"
                        : "#fff",
                    color: m.role === "user" ? "#fff" : "var(--ig-text)",
                    border: m.role === "bot" ? "1px solid var(--ig-border)" : "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {botLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: 14,
                    background: "#fff",
                    border: "1px solid var(--ig-border)",
                    color: "var(--ig-text-muted)",
                    fontSize: 13,
                  }}
                >
                  생각하는 중...
                </div>
              </div>
            )}
            <div ref={botBottomRef} />
          </div>
          <div style={{ padding: 12, borderTop: "1px solid var(--ig-border)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid var(--ig-border)",
                borderRadius: 24,
                padding: "4px 6px 4px 14px",
              }}
            >
              <input
                value={botInput}
                onChange={(e) => setBotInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askBot()}
                placeholder="가이드 봇에게 질문..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  padding: "8px 0",
                  fontSize: 14,
                  background: "transparent",
                }}
              />
              <button
                onClick={askBot}
                disabled={!botInput.trim() || botLoading}
                style={{
                  background: botInput.trim() ? "var(--ig-accent)" : "#e0e0e0",
                  color: "#fff",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: botInput.trim() ? "pointer" : "default",
                }}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
