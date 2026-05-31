import { useState, useEffect, useRef } from "react";
import type { Post, BotTurn } from "../api/client";
import {
  searchUsers,
  searchPosts,
  askChatbot,
  fetchSearchHistory,
  saveSearchHistory,
  fetchBotSessions,
  saveBotSessions,
} from "../api/client";
import { pushHistory, removeFromHistory, type HistoryItem } from "../api/searchHistory";
import {
  type BotSession,
  createSession,
  pickQuestions,
  titleFromMessage,
} from "../api/botSessions";
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
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 검색 기록을 서버에서 로드 + 변경 시 서버에 저장
  useEffect(() => {
    fetchSearchHistory()
      .then((items) => setHistory((items as HistoryItem[]) || []))
      .catch(() => {});
  }, []);

  const updateHistory = (updater: (prev: HistoryItem[]) => HistoryItem[]) => {
    setHistory((prev) => {
      const next = updater(prev);
      saveSearchHistory(next).catch(() => {});
      return next;
    });
  };

  // Chatbot (세션 기반)
  const [botInput, setBotInput] = useState("");
  const [botLoading, setBotLoading] = useState(false);
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [activeId, setActiveSessionId] = useState<string>("");
  const [exampleQs, setExampleQs] = useState<string[]>(() => pickQuestions(4));
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [sessionActiveIdx, setSessionActiveIdx] = useState(-1);

  const debounceRef = useRef<number | null>(null);
  const botBottomRef = useRef<HTMLDivElement | null>(null);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const botMessages = activeSession?.messages ?? [];

  // 가이드봇 대화 세션을 서버에서 로드/초기화
  useEffect(() => {
    fetchBotSessions()
      .then((items) => {
        let list = (items as BotSession[]) || [];
        if (list.length === 0) {
          list = [createSession()];
          saveBotSessions(list).catch(() => {});
        }
        setSessions(list);
        setActiveSessionId(list[0].id);
      })
      .catch(() => {
        const list = [createSession()];
        setSessions(list);
        setActiveSessionId(list[0].id);
      });
  }, []);

  const persist = (list: BotSession[]) => {
    setSessions(list);
    saveBotSessions(list).catch(() => {});
  };

  const newSession = () => {
    const s = createSession();
    const list = [s, ...sessions];
    persist(list);
    setActiveSessionId(s.id);
    setSessionMenuOpen(false);
    setExampleQs(pickQuestions(4));
  };

  const switchSession = (id: string) => {
    setActiveSessionId(id);
    setSessionMenuOpen(false);
    setExampleQs(pickQuestions(4));
  };

  const deleteSession = (id: string) => {
    let list = sessions.filter((s) => s.id !== id);
    if (list.length === 0) {
      list = [createSession()];
    }
    persist(list);
    if (id === activeId) {
      setActiveSessionId(list[0].id);
    }
  };

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
    updateHistory((prev) => pushHistory(prev, { type: "user", username: u }));
    onOpenProfile?.(u);
  };

  const askBot = async (question?: string) => {
    const q = (question ?? botInput).trim();
    if (!q || botLoading || !activeId) return;

    // 이전 대화 맥락을 history로 전달 (LLM처럼 세션 내 문맥 유지)
    const history: BotTurn[] = botMessages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

    const withUser = sessions.map((s) =>
      s.id === activeId
        ? {
            ...s,
            title: s.messages.length === 0 ? titleFromMessage(q) : s.title,
            messages: [...s.messages, { role: "user" as const, text: q }],
            updatedAt: Date.now(),
          }
        : s,
    );
    persist(withUser);
    setBotInput("");
    setBotLoading(true);
    try {
      const res = await askChatbot(q, history);
      const withBot = withUser.map((s) =>
        s.id === activeId
          ? { ...s, messages: [...s.messages, { role: "bot" as const, text: res.answer }], updatedAt: Date.now() }
          : s,
      );
      persist(withBot);
    } catch {
      const withErr = withUser.map((s) =>
        s.id === activeId
          ? { ...s, messages: [...s.messages, { role: "bot" as const, text: "잠시 후 다시 시도해주세요." }] }
          : s,
      );
      persist(withErr);
    } finally {
      setBotLoading(false);
      // 답변 후에도 예시 질문을 계속, 상황에 따라 무작위로 새로 노출
      setExampleQs(pickQuestions(4));
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
                placeholder="유저나 게시물 검색 (한글/영문)"
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
                    onClick={() => updateHistory(() => [])}
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
                      onClick={() =>
                        updateHistory((prev) => removeFromHistory(prev, (x) => x.ts === h.ts))
                      }
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
                    게시물
                  </div>
                  {postResults.map((p) => (
                    <div
                      key={p.id}
                      onMouseDown={() =>
                        updateHistory((prev) =>
                          pushHistory(prev, {
                            type: "post",
                            postId: p.id,
                            preview: p.content.slice(0, 40),
                            authorUsername: p.author_username,
                          }),
                        )
                      }
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>WhaleGram 가이드 봇</div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.9,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeSession ? activeSession.title : "앱 기능을 물어보세요"}
              </div>
            </div>
            {/* 세션 선택 드롭다운 (키보드 위/아래로 선택 가능) */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setSessionMenuOpen((o) => !o);
                  setSessionActiveIdx(-1);
                }}
                onKeyDown={(e) => {
                  if (!sessionMenuOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
                    setSessionMenuOpen(true);
                    setSessionActiveIdx(0);
                    e.preventDefault();
                    return;
                  }
                  if (sessionMenuOpen) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSessionActiveIdx((i) => (i + 1) % sessions.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSessionActiveIdx((i) => (i <= 0 ? sessions.length - 1 : i - 1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (sessionActiveIdx >= 0 && sessionActiveIdx < sessions.length) {
                        switchSession(sessions[sessionActiveIdx].id);
                      }
                    } else if (e.key === "Escape") {
                      setSessionMenuOpen(false);
                    }
                  }
                }}
                title="대화 기록"
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.18)",
                }}
              >
                🕑 기록 ▾
              </button>
              {sessionMenuOpen && (
                <div
                  className="ig-card"
                  onMouseLeave={() => setSessionMenuOpen(false)}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    width: 240,
                    maxHeight: 280,
                    overflowY: "auto",
                    zIndex: 60,
                    color: "var(--ig-text)",
                    boxShadow: "var(--ig-shadow-lg)",
                  }}
                >
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={newSession}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--ig-accent)",
                      borderBottom: "1px solid var(--ig-border-soft)",
                    }}
                  >
                    ＋ 새 대화
                  </button>
                  {sessions.map((s, i) => (
                    <div
                      key={s.id}
                      onMouseEnter={() => setSessionActiveIdx(i)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 10px",
                        background:
                          i === sessionActiveIdx
                            ? "rgba(0,0,0,0.05)"
                            : s.id === activeId
                            ? "#f5f5f5"
                            : "transparent",
                        borderTop: i === 0 ? "none" : "1px solid var(--ig-border-soft)",
                      }}
                    >
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => switchSession(s.id)}
                        style={{
                          flex: 1,
                          textAlign: "left",
                          fontSize: 13,
                          fontWeight: s.id === activeId ? 700 : 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.title}
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => deleteSession(s.id)}
                        title="삭제"
                        style={{ color: "var(--ig-text-muted)", fontSize: 14, padding: "0 4px" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={newSession}
              title="새 대화"
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.18)",
              }}
            >
              ＋
            </button>
          </header>
          <div
            className="ig-scrollbar"
            style={{
              flex: 1,
              minHeight: 0,
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
                <div style={{ fontSize: 40, marginBottom: 8 }}>🐳</div>
                <p style={{ fontSize: 14, margin: "0 0 4px", color: "var(--ig-text)", fontWeight: 600 }}>
                  무엇이든 물어보세요
                </p>
                <p style={{ fontSize: 12, margin: 0 }}>아래 추천 질문을 눌러도 좋아요.</p>
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
          {/* 추천 질문 — 답변 후에도 계속, 상황에 따라 무작위로 변경 */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              padding: "10px 12px 0",
              borderTop: "1px solid var(--ig-border-soft)",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--ig-text-muted)", fontWeight: 600, alignSelf: "center" }}>
              추천 질문
            </span>
            {exampleQs.map((q) => (
              <button
                key={q}
                onClick={() => askBot(q)}
                disabled={botLoading}
                className="ig-chip"
                style={{ cursor: "pointer", fontSize: 12 }}
              >
                {q}
              </button>
            ))}
            <button
              onClick={() => setExampleQs(pickQuestions(4))}
              title="다른 질문 보기"
              style={{ fontSize: 12, color: "var(--ig-text-muted)", padding: "0 4px" }}
            >
              🔄
            </button>
          </div>
          <div style={{ padding: 12, borderTop: "none" }}>
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
                onClick={() => askBot()}
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
