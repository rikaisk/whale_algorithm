import { useEffect, useState } from "react";
import {
  registerUser,
  login as apiLogin,
  logout as apiLogout,
  getMe,
  setToken,
  getToken,
  getInterestCategories,
  getUnreadCount,
  userExists,
  type InterestCategory,
} from "./api/client";
import Avatar from "./components/Avatar";
import { useIsMobile } from "./hooks/useIsMobile";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage";
import SearchPage from "./pages/SearchPage";
import RecommendPage from "./pages/RecommendPage";
import ChatPage from "./pages/ChatPage";

type Tab = "feed" | "search" | "recommend" | "chat" | "profile";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "feed", label: "피드", icon: "🏠" },
  { id: "search", label: "검색", icon: "🔍" },
  { id: "recommend", label: "추천", icon: "✨" },
  { id: "chat", label: "메시지", icon: "✈" },
  { id: "profile", label: "프로필", icon: "👤" },
];

export default function App() {
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("feed");
  const [profileTarget, setProfileTarget] = useState("");
  const [chatPeer, setChatPeer] = useState("");
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  // 회원가입 관심 분야 선택 단계
  const [regStep, setRegStep] = useState<0 | 1>(0);
  const [categories, setCategories] = useState<InterestCategory[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const isMobile = useIsMobile();
  // 회원가입 유저명 중복 검사 (입력창에서 실시간 안내)
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "taken" | "ok">("idle");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getMe()
      .then((me) => {
        setUsername(me.username);
        setUserId(me.id);
        setMyAvatar(me.avatar_base64 ?? null);
        setProfileTarget(me.username);
        setLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    getMe().then((me) => setMyAvatar(me.avatar_base64 ?? null)).catch(() => {});
  }, [tab, loggedIn]);

  // 안 읽은 메시지 수: 탭 전환 시 + 주기적으로 갱신
  useEffect(() => {
    if (!loggedIn) {
      setUnread(0);
      return;
    }
    let alive = true;
    const refresh = () =>
      getUnreadCount()
        .then((r) => {
          if (alive) setUnread(r.unread);
        })
        .catch(() => {});
    refresh();
    const id = window.setInterval(refresh, 12000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [loggedIn, tab]);

  // 회원가입 모드에서 유저명 중복을 입력창에서 실시간(디바운스) 안내
  useEffect(() => {
    if (loggedIn || mode !== "register") {
      setNameStatus("idle");
      return;
    }
    const name = input.trim();
    if (!name) {
      setNameStatus("idle");
      return;
    }
    setNameStatus("checking");
    const t = window.setTimeout(async () => {
      try {
        const exists = await userExists(name);
        setNameStatus(exists ? "taken" : "ok");
      } catch {
        setNameStatus("idle");
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [input, mode, loggedIn]);

  const login = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiLogin(input.trim(), password);
      setToken(res.token);
      setUsername(res.username);
      setUserId(res.id);
      setLoggedIn(true);
      setProfileTarget(res.username);
      setPassword("");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 1단계(유저명/비밀번호) 통과 → 관심 분야 선택 단계로
  const goToInterestStep = async () => {
    setError("");
    if (!input.trim() || password.length < 4) return;
    if (nameStatus === "taken") return;
    setRegStep(1);
    if (categories.length === 0) {
      try {
        setCategories(await getInterestCategories());
      } catch {
        setCategories([]);
      }
    }
  };

  const toggleInterest = (label: string) => {
    setSelectedInterests((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  // 최종 가입 (interests=[] 이면 '넘어가기'와 동일 → 무작위 추천)
  const register = async (interests: string[]) => {
    setError("");
    setLoading(true);
    try {
      await registerUser(input.trim(), password, interests);
      const res = await apiLogin(input.trim(), password);
      setToken(res.token);
      setUsername(res.username);
      setUserId(res.id);
      setLoggedIn(true);
      setProfileTarget(res.username);
      setPassword("");
      setRegStep(0);
      setSelectedInterests([]);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await apiLogout();
    setLoggedIn(false);
    setUsername("");
    setUserId("");
    setInput("");
    setPassword("");
    setRegStep(0);
    setSelectedInterests([]);
  };

  const openProfile = (target: string) => {
    setProfileTarget(target);
    setTab("profile");
  };

  // 프로필의 '메시지 보내기' → 해당 유저와 메시지 탭에서 바로 대화
  const openChat = (target: string) => {
    setChatPeer(target);
    setTab("chat");
  };

  const refreshUnread = () => {
    getUnreadCount()
      .then((r) => setUnread(r.unread))
      .catch(() => {});
  };

  if (!loggedIn) {
    const isLogin = mode === "login";
    const submitForm = () => {
      if (loading || !input.trim() || password.length < 4) return;
      if (isLogin) login();
      else goToInterestStep();
    };

    // 회원가입 2단계: 관심 분야 선택
    if (!isLogin && regStep === 1) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "var(--ig-bg)",
          }}
        >
          <div
            className="ig-card ig-fade-in"
            style={{ width: "100%", maxWidth: 440, padding: "32px 28px" }}
          >
            <h2 style={{ textAlign: "center", margin: "0 0 6px", fontSize: 22 }}>
              관심 분야를 골라주세요
            </h2>
            <p
              style={{
                textAlign: "center",
                margin: "0 0 20px",
                fontSize: 13,
                color: "var(--ig-text-muted)",
              }}
            >
              고른 분야와 어울리는 친구와 게시물을 추천해드려요.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              {categories.map((c) => {
                const on = selectedInterests.includes(c.label);
                return (
                  <button
                    key={c.label}
                    onClick={() => toggleInterest(c.label)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                      border: on
                        ? "1.5px solid transparent"
                        : "1.5px solid var(--ig-border)",
                      background: on ? "var(--ig-grad-cta)" : "#fff",
                      color: on ? "#fff" : "var(--ig-text)",
                      transition: "all 0.15s",
                    }}
                  >
                    {c.emoji} {c.label}
                  </button>
                );
              })}
            </div>
            <button
              className="ig-btn-primary"
              disabled={loading || selectedInterests.length === 0}
              onClick={() => register(selectedInterests)}
              style={{ width: "100%", padding: "10px 0", borderRadius: 8 }}
            >
              {loading
                ? "처리 중..."
                : selectedInterests.length > 0
                ? `${selectedInterests.length}개 선택 · 가입 완료`
                : "관심 분야를 선택하세요"}
            </button>
            <button
              onClick={() => register([])}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 10,
                color: "var(--ig-text-muted)",
                fontSize: 14,
                fontWeight: 600,
                padding: "6px 0",
              }}
            >
              넘어가기
            </button>
            {error && (
              <p style={{ color: "var(--ig-danger)", fontSize: 13, marginTop: 12, textAlign: "center" }}>
                {error}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "var(--ig-bg)",
        }}
      >
        <div
          className="ig-card ig-fade-in"
          style={{ width: "100%", maxWidth: 350, padding: "32px 28px" }}
        >
          <h1
            style={{
              textAlign: "center",
              margin: "0 0 24px",
              fontFamily: "var(--ig-font-script)",
              fontWeight: 400,
              fontSize: 44,
              background: "var(--ig-grad-cta)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            WhaleGram
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              className="ig-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitForm()}
              placeholder="유저명"
            />
            {!isLogin && input.trim() && nameStatus !== "idle" && (
              <p
                style={{
                  margin: "-2px 2px 0",
                  fontSize: 12,
                  color:
                    nameStatus === "taken"
                      ? "var(--ig-danger)"
                      : nameStatus === "ok"
                      ? "#2e7d32"
                      : "var(--ig-text-muted)",
                }}
              >
                {nameStatus === "checking"
                  ? "유저명 확인 중..."
                  : nameStatus === "taken"
                  ? "이미 사용 중인 유저명입니다"
                  : "사용 가능한 유저명입니다"}
              </p>
            )}
            <input
              className="ig-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitForm()}
              placeholder="비밀번호 (4자 이상)"
            />
            <button
              className="ig-btn-primary"
              disabled={
                loading ||
                !input.trim() ||
                password.length < 4 ||
                (!isLogin && (nameStatus === "taken" || nameStatus === "checking"))
              }
              onClick={isLogin ? login : goToInterestStep}
              style={{ marginTop: 8, padding: "10px 0", borderRadius: 8 }}
            >
              {loading ? "처리 중..." : isLogin ? "로그인" : "다음"}
            </button>
          </div>
          {error && (
            <p style={{ color: "var(--ig-danger)", fontSize: 13, marginTop: 12, textAlign: "center" }}>
              {error}
            </p>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "24px 0",
              color: "var(--ig-text-muted)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--ig-border)" }} />
            또는
            <div style={{ flex: 1, height: 1, background: "var(--ig-border)" }} />
          </div>
          <p style={{ textAlign: "center", fontSize: 14, margin: 0, color: "var(--ig-text-muted)" }}>
            {isLogin ? "계정이 없으신가요? " : "이미 가입하셨나요? "}
            <button
              onClick={() => {
                setMode(isLogin ? "register" : "login");
                setError("");
              }}
              style={{ color: "var(--ig-accent)", fontWeight: 600 }}
            >
              {isLogin ? "가입하기" : "로그인"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--ig-bg)", minHeight: "100vh" }}>
      <header
        style={{
          background: "var(--ig-surface)",
          borderBottom: "1px solid var(--ig-border)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 935,
            margin: "0 auto",
            padding: isMobile ? "0 12px" : "0 20px",
            height: isMobile ? 52 : 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isMobile ? 6 : 16,
          }}
        >
          <h1
            onClick={() => setTab("feed")}
            style={{
              margin: 0,
              fontFamily: "var(--ig-font-script)",
              fontWeight: 400,
              fontSize: isMobile ? 22 : 28,
              flexShrink: 0,
              background: "var(--ig-grad-cta)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            WhaleGram
          </h1>
          <nav style={{ display: "flex", gap: isMobile ? 0 : 4 }}>
            {NAV.map((n) => {
              const active = tab === n.id;
              const showBadge = n.id === "chat" && unread > 0;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (n.id === "profile") setProfileTarget(username);
                    setTab(n.id);
                  }}
                  title={n.label}
                  style={{
                    position: "relative",
                    padding: isMobile ? "8px 9px" : "8px 14px",
                    borderRadius: 8,
                    fontSize: isMobile ? 20 : 18,
                    color: active ? "var(--ig-text)" : "var(--ig-text-muted)",
                    background: active ? "rgba(0,0,0,0.04)" : "transparent",
                    fontWeight: active ? 700 : 400,
                    transition: "background 0.15s",
                  }}
                >
                  {n.icon}
                  {showBadge && (
                    <span
                      style={{
                        position: "absolute",
                        right: 4,
                        bottom: 2,
                        minWidth: 16,
                        height: 16,
                        padding: "0 4px",
                        borderRadius: 8,
                        background: "#ed4956",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: "16px",
                        textAlign: "center",
                        boxSizing: "border-box",
                      }}
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
            <Avatar username={username} size={28} src={myAvatar} onClick={() => { setProfileTarget(username); setTab("profile"); }} />
            <button
              onClick={logout}
              style={{ color: "var(--ig-text-muted)", fontSize: isMobile ? 18 : 13, fontWeight: 600 }}
              title="로그아웃"
            >
              {isMobile ? "⎋" : "로그아웃"}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 935, margin: "0 auto", padding: isMobile ? "14px 10px" : "24px 20px" }}>
        {tab === "feed" && <FeedPage username={username} userId={userId} currentAvatar={myAvatar} onOpenProfile={openProfile} />}
        {tab === "search" && <SearchPage currentUserId={userId} currentUsername={username} currentAvatar={myAvatar} onOpenProfile={openProfile} />}
        {tab === "recommend" && <RecommendPage username={username} userId={userId} currentAvatar={myAvatar} onOpenProfile={openProfile} />}
        {tab === "chat" && (
          <ChatPage
            username={username}
            userId={userId}
            onOpenProfile={openProfile}
            initialPeer={chatPeer}
            onPeerConsumed={() => setChatPeer("")}
            onConversationRead={refreshUnread}
          />
        )}
        {tab === "profile" && (
          <ProfilePage
            targetUsername={profileTarget || username}
            currentUsername={username}
            currentUserId={userId}
            currentAvatar={myAvatar}
            onOpenProfile={openProfile}
            onOpenChat={openChat}
          />
        )}
      </main>
    </div>
  );
}
