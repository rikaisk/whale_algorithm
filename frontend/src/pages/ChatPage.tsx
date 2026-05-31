import { useEffect, useRef, useState } from "react";
import {
  listConversations,
  getConversation,
  openMessageSocket,
  getToken,
  userExists,
  searchUsers,
  type ConversationSummary,
  type DmMessage,
} from "../api/client";
import Avatar from "../components/Avatar";

function relTime(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간`;
  return `${Math.floor(diff / 86400)}일`;
}

export default function ChatPage({
  username,
  userId,
  onOpenProfile,
}: {
  username: string;
  userId: string;
  onOpenProfile?: (username: string) => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [peer, setPeer] = useState<string>("");
  const [peerInput, setPeerInput] = useState<string>("");
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const refreshConversations = async () => {
    try {
      setConversations(await listConversations());
    } catch {}
  };

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const ws = openMessageSocket(token);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type !== "message" && data.type !== "echo") return;
        const msg: DmMessage = {
          id: data.id,
          sender_id: data.sender_id,
          receiver_id: data.receiver_id,
          content: data.content,
          image_url: data.image_url ?? null,
          created_at: data.created_at,
          read: false,
        };
        const otherUsername: string | undefined =
          data.sender_id === userId ? undefined : data.sender_username;
        if (otherUsername && (!peer || otherUsername === peer)) {
          setMessages((prev) => [...prev, msg]);
        } else if (data.sender_id === userId && peer) {
          setMessages((prev) => [...prev, msg]);
        }
        refreshConversations();
      } catch {}
    };

    ws.onerror = () => setError("실시간 연결에 문제가 있습니다.");
    return () => {
      ws.close();
    };
  }, [userId, peer]);

  useEffect(() => {
    if (!peer) {
      setMessages([]);
      return;
    }
    getConversation(peer).then(setMessages).catch(() => setMessages([]));
  }, [peer]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Autocomplete (debounced)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = peerInput.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await searchUsers(q);
        const list: string[] = (res.results || []).filter((u: string) => u !== username);
        setSuggestions(list.slice(0, 8));
      } catch {
        setSuggestions([]);
      }
    }, 150);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [peerInput, username]);

  const send = () => {
    const content = draft.trim();
    if (!content || !peer) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("연결이 끊겼습니다. 새로고침 해주세요.");
      return;
    }
    ws.send(JSON.stringify({ to_username: peer, content }));
    setDraft("");
  };

  const startConversation = async (override?: string) => {
    const target = (override ?? peerInput).trim();
    if (!target) return;
    if (target === username) {
      setError("본인이 아닌 다른 유저명을 입력하세요.");
      return;
    }
    const exists = await userExists(target);
    if (!exists) {
      setError("존재하지 않는 사용자입니다");
      setPeer("");
      setShowSuggestions(false);
      return;
    }
    setPeerInput(target);
    setPeer(target);
    setError("");
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div
      className="ig-card"
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        height: "calc(100vh - 140px)",
        minHeight: 500,
        maxHeight: 800,
        overflow: "hidden",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <aside style={{ borderRight: "1px solid var(--ig-border)", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: 14, borderBottom: "1px solid var(--ig-border)", display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1 }}>{username}</h3>
        </header>
        <div style={{ padding: 12, position: "relative" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="ig-input"
              value={peerInput}
              onChange={(e) => {
                setPeerInput(e.target.value);
                setShowSuggestions(true);
                if (error) setError("");
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="유저명 입력"
              onKeyDown={(e) => e.key === "Enter" && startConversation()}
            />
            <button
              className="ig-btn-primary"
              onClick={() => startConversation()}
              title="대화 시작"
              style={{ padding: "8px 14px", fontSize: 16 }}
            >
              🔍
            </button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="ig-card"
              style={{
                position: "absolute",
                top: "100%",
                left: 12,
                right: 12,
                zIndex: 50,
                marginTop: 4,
                maxHeight: 220,
                overflowY: "auto",
                boxShadow: "var(--ig-shadow-lg)",
              }}
            >
              {suggestions.map((u, i) => (
                <button
                  key={u}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => startConversation(u)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    width: "100%",
                    textAlign: "left",
                    borderTop: i === 0 ? "none" : "1px solid var(--ig-border-soft)",
                  }}
                >
                  <Avatar username={u} size={28} />
                  <span style={{ fontSize: 14 }}>{u}</span>
                </button>
              ))}
            </div>
          )}
          {error && (
            <p style={{ color: "var(--ig-danger)", fontSize: 12, margin: "6px 2px 0" }}>
              {error}
            </p>
          )}
        </div>
        <div className="ig-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 ? (
            <p style={{ padding: 16, color: "var(--ig-text-muted)", fontSize: 13, textAlign: "center" }}>
              아직 대화가 없습니다.
            </p>
          ) : (
            conversations.map((c) => {
              const active = peer === c.peer_username;
              return (
                <button
                  key={c.peer_id}
                  onClick={() => {
                    setPeer(c.peer_username);
                    setPeerInput(c.peer_username);
                    setError("");
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: active ? "#fafafa" : "transparent",
                    textAlign: "left",
                  }}
                >
                  <Avatar username={c.peer_username} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.peer_username}</div>
                    <div
                      style={{
                        color: "var(--ig-text-muted)",
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.last_content} · {relTime(c.last_at)}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section style={{ display: "flex", flexDirection: "column", background: "#fff" }}>
        {!peer ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ig-text-muted)",
              gap: 12,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 64 }}>✈</div>
            <h3 style={{ margin: 0, fontWeight: 400, color: "var(--ig-text)" }}>내 메시지</h3>
            <p style={{ margin: 0, fontSize: 13 }}>친구나 그룹에 비공개 메시지를 보내보세요.</p>
          </div>
        ) : (
          <>
            <header
              onClick={onOpenProfile ? () => onOpenProfile(peer) : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 14,
                borderBottom: "1px solid var(--ig-border)",
                cursor: onOpenProfile ? "pointer" : "default",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (onOpenProfile) e.currentTarget.style.background = "#fafafa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              title={onOpenProfile ? "프로필 보기" : undefined}
            >
              <Avatar username={peer} size={36} />
              <div style={{ fontWeight: 600, fontSize: 15 }}>{peer}</div>
            </header>
            <div
              className="ig-scrollbar"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: "#fafafa",
              }}
            >
              {messages.length === 0 && (
                <p style={{ color: "var(--ig-text-muted)", fontSize: 13, textAlign: "center" }}>
                  대화를 시작해보세요.
                </p>
              )}
              {messages.map((m, i) => {
                const mine = m.sender_id === userId;
                const prev = messages[i - 1];
                const showTime = !prev || m.created_at - prev.created_at > 600;
                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column" }}>
                    {showTime && (
                      <div
                        style={{
                          textAlign: "center",
                          fontSize: 11,
                          color: "var(--ig-text-muted)",
                          margin: "10px 0 4px",
                        }}
                      >
                        {new Date(m.created_at * 1000).toLocaleString("ko-KR")}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: mine ? "flex-end" : "flex-start",
                        gap: 4,
                      }}
                    >
                      {m.content && (
                        <div
                          style={{
                            background: mine
                              ? "linear-gradient(135deg, #4f5bd5 0%, #962fbf 50%, #d62976 100%)"
                              : "#efefef",
                            color: mine ? "#fff" : "var(--ig-text)",
                            padding: "8px 14px",
                            borderRadius: 18,
                            maxWidth: "70%",
                            fontSize: 14,
                            lineHeight: 1.4,
                            wordBreak: "break-word",
                          }}
                        >
                          {m.content}
                        </div>
                      )}
                      {m.image_url && (
                        <img
                          src={m.image_url}
                          alt="AI 생성 이미지"
                          loading="lazy"
                          style={{
                            maxWidth: "70%",
                            maxHeight: 280,
                            borderRadius: 14,
                            border: "1px solid var(--ig-border)",
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
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
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="메시지 입력..."
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
                  onClick={send}
                  disabled={!draft.trim()}
                  style={{
                    color: draft.trim() ? "var(--ig-accent)" : "rgba(0,149,246,0.4)",
                    fontWeight: 600,
                    fontSize: 14,
                    padding: "6px 10px",
                  }}
                >
                  보내기
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
