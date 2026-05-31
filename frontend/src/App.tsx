import { useEffect, useState } from "react";
import {
  registerUser,
  login as apiLogin,
  logout as apiLogout,
  getMe,
  setToken,
  getToken,
} from "./api/client";
import Avatar from "./components/Avatar";
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
  const [bio, setBio] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("feed");
  const [profileTarget, setProfileTarget] = useState("");
  const [loading, setLoading] = useState(false);

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

  const register = async () => {
    setError("");
    setLoading(true);
    try {
      await registerUser(input.trim(), password, bio.trim());
      const res = await apiLogin(input.trim(), password);
      setToken(res.token);
      setUsername(res.username);
      setUserId(res.id);
      setLoggedIn(true);
      setProfileTarget(res.username);
      setPassword("");
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
    setBio("");
  };

  const openProfile = (target: string) => {
    setProfileTarget(target);
    setTab("profile");
  };

  if (!loggedIn) {
    const isLogin = mode === "login";
    const submitForm = () => {
      if (loading || !input.trim() || password.length < 4) return;
      if (isLogin) login();
      else register();
    };
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
            AlgoSNS
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              className="ig-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitForm()}
              placeholder="유저명"
            />
            <input
              className="ig-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitForm()}
              placeholder="비밀번호 (4자 이상)"
            />
            {!isLogin && (
              <textarea
                className="ig-input ig-fade-in"
                style={{ resize: "vertical", minHeight: 64 }}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitForm();
                  }
                }}
                placeholder="자기소개 (Shift+Enter 줄바꿈, Enter 제출)"
                rows={2}
              />
            )}
            <button
              className="ig-btn-primary"
              disabled={loading || !input.trim() || password.length < 4}
              onClick={isLogin ? login : register}
              style={{ marginTop: 8, padding: "10px 0", borderRadius: 8 }}
            >
              {loading ? "처리 중..." : isLogin ? "로그인" : "가입하기"}
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
            padding: "0 20px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <h1
            onClick={() => setTab("feed")}
            style={{
              margin: 0,
              fontFamily: "var(--ig-font-script)",
              fontWeight: 400,
              fontSize: 28,
              background: "var(--ig-grad-cta)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            AlgoSNS
          </h1>
          <nav style={{ display: "flex", gap: 4 }}>
            {NAV.map((n) => {
              const active = tab === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (n.id === "profile") setProfileTarget(username);
                    setTab(n.id);
                  }}
                  title={n.label}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 18,
                    color: active ? "var(--ig-text)" : "var(--ig-text-muted)",
                    background: active ? "rgba(0,0,0,0.04)" : "transparent",
                    fontWeight: active ? 700 : 400,
                    transition: "background 0.15s",
                  }}
                >
                  {n.icon}
                </button>
              );
            })}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar username={username} size={28} src={myAvatar} onClick={() => { setProfileTarget(username); setTab("profile"); }} />
            <button
              onClick={logout}
              style={{ color: "var(--ig-text-muted)", fontSize: 13, fontWeight: 600 }}
              title="로그아웃"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 935, margin: "0 auto", padding: "24px 20px" }}>
        {tab === "feed" && <FeedPage username={username} userId={userId} currentAvatar={myAvatar} onOpenProfile={openProfile} />}
        {tab === "search" && <SearchPage currentUserId={userId} currentUsername={username} currentAvatar={myAvatar} onOpenProfile={openProfile} />}
        {tab === "recommend" && <RecommendPage username={username} userId={userId} currentAvatar={myAvatar} onOpenProfile={openProfile} />}
        {tab === "chat" && <ChatPage username={username} userId={userId} onOpenProfile={openProfile} />}
        {tab === "profile" && (
          <ProfilePage
            targetUsername={profileTarget || username}
            currentUsername={username}
            currentUserId={userId}
            currentAvatar={myAvatar}
            onOpenProfile={openProfile}
          />
        )}
      </main>
    </div>
  );
}
