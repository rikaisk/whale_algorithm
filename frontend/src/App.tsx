import { useState } from "react";
import { registerUser, getProfile } from "./api/client";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage";
import SearchPage from "./pages/SearchPage";
import RecommendPage from "./pages/RecommendPage";

type Tab = "feed" | "profile" | "search" | "recommend";

export default function App() {
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [input, setInput] = useState("");
  const [bio, setBio] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("feed");
  const [profileTarget, setProfileTarget] = useState("");

  const login = async () => {
    setError("");
    try {
      const profile = await getProfile(input.trim());
      setUsername(profile.username);
      setUserId(profile.id);
      setLoggedIn(true);
      setProfileTarget(profile.username);
    } catch {
      setError("존재하지 않는 유저입니다.");
    }
  };

  const register = async () => {
    setError("");
    try {
      const res = await registerUser(input.trim(), bio.trim());
      setUsername(res.username);
      setUserId(res.id);
      setLoggedIn(true);
      setProfileTarget(res.username);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "등록에 실패했습니다.");
    }
  };

  const navStyle = (t: Tab): React.CSSProperties => ({
    padding: "8px 20px",
    cursor: "pointer",
    border: "none",
    borderBottom: tab === t ? "3px solid #1a73e8" : "3px solid transparent",
    background: "transparent",
    fontWeight: tab === t ? 700 : 400,
    color: tab === t ? "#1a73e8" : "#555",
    fontSize: 15,
  });

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 24, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
        <h1 style={{ textAlign: "center", color: "#1a73e8", marginBottom: 24 }}>AlgoSNS</h1>
        <div style={{ display: "flex", marginBottom: 16 }}>
          <button
            onClick={() => setMode("login")}
            style={{ flex: 1, padding: 8, cursor: "pointer", background: mode === "login" ? "#1a73e8" : "#eee", color: mode === "login" ? "#fff" : "#333", border: "none", borderRadius: "6px 0 0 6px" }}
          >
            로그인
          </button>
          <button
            onClick={() => setMode("register")}
            style={{ flex: 1, padding: 8, cursor: "pointer", background: mode === "register" ? "#1a73e8" : "#eee", color: mode === "register" ? "#fff" : "#333", border: "none", borderRadius: "0 6px 6px 0" }}
          >
            회원가입
          </button>
        </div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="유저명"
          style={{ width: "100%", padding: "8px 10px", marginBottom: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        {mode === "register" && (
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="자기소개 (Solar AI가 관심사를 추출합니다)"
            rows={3}
            style={{ width: "100%", padding: "8px 10px", marginBottom: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        )}
        {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
        <button
          onClick={mode === "login" ? login : register}
          style={{ width: "100%", padding: "10px 0", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 15 }}
        >
          {mode === "login" ? "로그인" : "가입하기"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #eee", marginBottom: 16 }}>
        <h1 style={{ margin: 0, color: "#1a73e8", fontSize: 22 }}>AlgoSNS</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#555", fontSize: 14 }}>@{username}</span>
          <button onClick={() => setLoggedIn(false)} style={{ padding: "4px 10px", cursor: "pointer", border: "1px solid #ccc", borderRadius: 4, background: "#fff" }}>
            로그아웃
          </button>
        </div>
      </header>
      <nav style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: 20 }}>
        <button style={navStyle("feed")} onClick={() => setTab("feed")}>피드</button>
        <button style={navStyle("profile")} onClick={() => { setTab("profile"); setProfileTarget(username); }}>프로필</button>
        <button style={navStyle("search")} onClick={() => setTab("search")}>검색</button>
        <button style={navStyle("recommend")} onClick={() => setTab("recommend")}>추천</button>
      </nav>
      <main>
        {tab === "feed" && <FeedPage username={username} userId={userId} />}
        {tab === "profile" && (
          <ProfilePage
            targetUsername={profileTarget || username}
            currentUsername={username}
            currentUserId={userId}
          />
        )}
        {tab === "search" && <SearchPage currentUserId={userId} />}
        {tab === "recommend" && <RecommendPage username={username} userId={userId} />}
      </main>
    </div>
  );
}
