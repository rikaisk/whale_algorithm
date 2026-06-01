import { useEffect, useRef, useState } from "react";
import {
  listConversations,
  getConversation,
  userExists,
  searchUsers,
  type ConversationSummary,
  type DmMessage,
} from "../api/client";
import Avatar from "../components/Avatar";
import { useIsMobile } from "../hooks/useIsMobile";

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
  initialPeer,
  onPeerConsumed,
  onConversationRead,
  incoming,
  wsSend,
  onActivePeer,
}: {
  username: string;
  userId: string;
  onOpenProfile?: (username: string) => void;
  initialPeer?: string;
  onPeerConsumed?: () => void;
  onConversationRead?: () => void;
  incoming?: { data: any; nonce: number } | null;
  wsSend?: (payload: any) => void;
  onActivePeer?: (peer: string) => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [peer, setPeer] = useState<string>("");
  const [peerInput, setPeerInput] = useState<string>("");
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const isMobile = useIsMobile();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const peerRef = useRef("");

  // 프로필의 '메시지 보내기'로 진입 시 해당 유저와 바로 대화 시작
  useEffect(() => {
    const target = (initialPeer || "").trim();
    if (!target) return;
    setPeer(target);
    setPeerInput(target);
    setError("");
    setShowSuggestions(false);
    setSuggestions([]);
    onPeerConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPeer]);

  const refreshConversations = async () => {
    try {
      setConversations(await listConversations());
    } catch {}
  };

  useEffect(() => {
    refreshConversations();
  }, []);

  // 현재 열려있는 대화 상대를 App에 알림(전역 ws가 읽음/배지 판단에 사용)
  useEffect(() => {
    peerRef.current = peer;
    onActivePeer?.(peer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer]);

  // App의 전역 WebSocket이 전달한 수신 메시지 처리
  useEffect(() => {
    if (!incoming) return;
    const data = incoming.data;
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
    const cur = peerRef.current;
    const otherUsername: string | undefined =
      data.sender_id === userId ? undefined : data.sender_username;
    if (otherUsername && cur && otherUsername === cur) {
      setMessages((prev) => [...prev, msg]);
    } else if (data.sender_id === userId && cur) {
      setMessages((prev) => [...prev, msg]);
    }
    refreshConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.nonce]);

  useEffect(() => {
    if (!peer) {
      setMessages([]);
      return;
    }
    getConversation(peer)
      .then((msgs) => {
        setMessages(msgs);
        // 대화를 열면 서버에서 읽음 처리됨 → 총 배지 + 좌측 목록 갱신
        onConversationRead?.();
        refreshConversations();
      })
      .catch(() => setMessages([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setActiveIndex(-1);
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
    if (!wsSend) {
      setError("연결이 끊겼습니다. 새로고침 해주세요.");
      return;
    }
    wsSend({ to_username: peer, content });
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
        gridTemplateColumns: isMobile ? "1fr" : "320px 1fr",
        height: isMobile ? "calc(100vh - 92px)" : "calc(100vh - 140px)",
        minHeight: isMobile ? 360 : 500,
        maxHeight: isMobile ? "none" : 800,
        overflow: "hidden",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      {(!isMobile || !peer) && (
      <aside style={{ borderRight: isMobile ? "none" : "1px solid var(--ig-border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
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
                setActiveIndex(-1);
                if (error) setError("");
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="유저명 입력"
              onKeyDown={(e) => {
                const list = suggestions;
                if (showSuggestions && list.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) => (i + 1) % list.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => (i <= 0 ? list.length - 1 : i - 1));
                    return;
                  }
                  if (e.key === "Escape") {
                    setShowSuggestions(false);
                    setActiveIndex(-1);
                    return;
                  }
                }
                if (e.key === "Enter") {
                  if (activeIndex >= 0 && activeIndex < list.length) {
                    startConversation(list[activeIndex]);
                  } else {
                    startConversation();
                  }
                }
              }}
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
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    width: "100%",
                    textAlign: "left",
                    background: i === activeIndex ? "rgba(0,0,0,0.05)" : "transparent",
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
        <div className="ig-scrollbar" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
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
                    <div style={{ fontWeight: (c.unread ?? 0) > 0 ? 700 : 600, fontSize: 14 }}>
                      {c.peer_username}
                    </div>
                    <div
                      style={{
                        color: (c.unread ?? 0) > 0 ? "var(--ig-text)" : "var(--ig-text-muted)",
                        fontWeight: (c.unread ?? 0) > 0 ? 600 : 400,
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.last_content} · {relTime(c.last_at)}
                    </div>
                  </div>
                  {(c.unread ?? 0) > 0 && (
                    <span
                      style={{
                        flexShrink: 0,
                        minWidth: 18,
                        height: 18,
                        padding: "0 5px",
                        borderRadius: 9,
                        background: "#ed4956",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: "18px",
                        textAlign: "center",
                        boxSizing: "border-box",
                      }}
                    >
                      {(c.unread ?? 0) > 99 ? "99+" : c.unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>
      )}

      {(!isMobile || !!peer) && (
      <section style={{ display: "flex", flexDirection: "column", background: "#fff", minHeight: 0 }}>
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
              {isMobile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPeer("");
                    setPeerInput("");
                  }}
                  title="목록으로"
                  style={{ fontSize: 22, color: "var(--ig-text)", padding: "0 4px 0 0", lineHeight: 1 }}
                >
                  ‹
                </button>
              )}
              <Avatar username={peer} size={36} />
              <div style={{ fontWeight: 600, fontSize: 15 }}>{peer}</div>
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
                          alt="첨부 이미지"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
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
      )}
    </div>
  );
}
