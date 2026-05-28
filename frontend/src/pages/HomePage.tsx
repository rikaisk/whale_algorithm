import { useState } from "react";
import { registerUser, getUser } from "../api";

interface Props {
  onLogin: (username: string) => void;
}

export default function HomePage({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    try {
      await getUser(username);
      onLogin(username);
    } catch {
      setError("User not found. Please register first.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !bio.trim()) return;
    setLoading(true);
    setError("");
    try {
      await registerUser(username, bio);
      onLogin(username);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto" }}>
      <h1 className="page-title" style={{ textAlign: "center" }}>AlgoSNS</h1>
      <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Algorithm-powered Social Network
      </p>

      <div className="tabs">
        <button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>
          Login
        </button>
        <button className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>
          Register
        </button>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
          />
        </div>

        {mode === "register" && (
          <div className="form-group">
            <label>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
            />
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <button
          className="btn"
          style={{ width: "100%", marginTop: "0.5rem" }}
          onClick={mode === "login" ? handleLogin : handleRegister}
          disabled={loading}
        >
          {loading ? "Processing..." : mode === "login" ? "Login" : "Register"}
        </button>
      </div>
    </div>
  );
}
