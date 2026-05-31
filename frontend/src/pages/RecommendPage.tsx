import { useEffect, useState } from "react";
import type { Post } from "../api/client";
import {
  recommendPosts,
  recommendPeople,
  recommendPath,
  followUser,
} from "../api/client";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";

type Tab = "posts" | "people" | "path";

export default function RecommendPage({
  username,
  userId,
  onOpenProfile,
}: {
  username: string;
  userId: string;
  onOpenProfile?: (username: string) => void;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [people, setPeople] = useState<
    { user_id: string; username: string; common_friends: number; followed?: boolean }[]
  >([]);
  const [pathFrom, setPathFrom] = useState(username);
  const [pathTo, setPathTo] = useState("");
  const [path, setPath] = useState<string[] | null>(null);
  const [pathError, setPathError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await recommendPosts(username);
      setPosts(res.results);
      setInterests(res.interests_used);
    } finally {
      setLoading(false);
    }
  };

  const loadPeople = async () => {
    setLoading(true);
    try {
      const res = await recommendPeople(username);
      setPeople(res.map((p: any) => ({ ...p, followed: false })));
    } finally {
      setLoading(false);
    }
  };

  const findPath = async () => {
    if (!pathFrom.trim() || !pathTo.trim()) return;
    setPathError("");
    setLoading(true);
    try {
      const res = await recommendPath(pathFrom, pathTo);
      setPath(res.path);
    } catch (e: any) {
      setPath([]);
      setPathError(e?.response?.data?.detail ?? "경로를 찾을 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "posts" && posts.length === 0) loadPosts();
    if (activeTab === "people" && people.length === 0) loadPeople();
  }, [activeTab]);

  const handleFollow = async (target: string) => {
    try {
      await followUser(username, target);
      setPeople((prev) =>
        prev.map((p) => (p.username === target ? { ...p, followed: true } : p)),
      );
    } catch {}
  };

  const tabBtn = (id: Tab, label: string) => {
    const active = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
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
        style={{
          display: "flex",
          borderBottom: "1px solid var(--ig-border)",
          marginBottom: 16,
          justifyContent: "center",
          gap: 24,
        }}
      >
        {tabBtn("posts", "✨ 게시글")}
        {tabBtn("people", "👥 사람")}
        {tabBtn("path", "🔗 인맥경로")}
      </div>

      {activeTab === "posts" && (
        <>
          {interests.length > 0 && (
            <div className="ig-card" style={{ padding: 12, marginBottom: 14, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
              <div style={{ color: "#15803d", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                🤖 Solar AI가 분석한 관심사
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {interests.map((t) => (
                  <span
                    key={t}
                    style={{
                      background: "#bbf7d0",
                      color: "#15803d",
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--ig-text-muted)" }}>분석 중...</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--ig-text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🤔</div>
              <p style={{ margin: 0 }}>아직 추천할 게시글이 없습니다.</p>
            </div>
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                currentUserId={userId}
                onOpenProfile={onOpenProfile}
              />
            ))
          )}
        </>
      )}

      {activeTab === "people" && (
        <div className="ig-card">
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--ig-border-soft)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            회원님이 알 수도 있는 사람
          </div>
          {loading ? (
            <p style={{ padding: 40, textAlign: "center", color: "var(--ig-text-muted)" }}>분석 중...</p>
          ) : people.length === 0 ? (
            <p style={{ padding: 40, textAlign: "center", color: "var(--ig-text-muted)" }}>
              추천할 사람이 없습니다.
            </p>
          ) : (
            people.map((u) => (
              <div
                key={u.user_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderTop: "1px solid var(--ig-border-soft)",
                }}
              >
                <Avatar
                  username={u.username}
                  size={44}
                  onClick={onOpenProfile ? () => onOpenProfile(u.username) : undefined}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    onClick={onOpenProfile ? () => onOpenProfile(u.username) : undefined}
                    style={{ fontWeight: 600, fontSize: 14, cursor: onOpenProfile ? "pointer" : "default" }}
                  >
                    {u.username}
                  </div>
                  <div style={{ color: "var(--ig-text-muted)", fontSize: 12 }}>
                    공통 친구 {u.common_friends}명
                  </div>
                </div>
                <button
                  onClick={() => handleFollow(u.username)}
                  disabled={u.followed}
                  className={u.followed ? "ig-btn-secondary" : "ig-btn-primary"}
                  style={{ padding: "6px 14px", fontSize: 13 }}
                >
                  {u.followed ? "팔로잉" : "팔로우"}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "path" && (
        <div className="ig-card" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>인맥 경로 찾기</h3>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ig-text-muted)" }}>
            두 유저 간의 최단 친구 경로를 Dijkstra 알고리즘으로 계산합니다.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 14 }}>
            <input
              className="ig-input"
              value={pathFrom}
              onChange={(e) => setPathFrom(e.target.value)}
              placeholder="출발 유저명"
            />
            <input
              className="ig-input"
              value={pathTo}
              onChange={(e) => setPathTo(e.target.value)}
              placeholder="도착 유저명"
              onKeyDown={(e) => e.key === "Enter" && findPath()}
            />
            <button
              className="ig-btn-primary"
              onClick={findPath}
              disabled={loading || !pathFrom.trim() || !pathTo.trim()}
              style={{ padding: "8px 16px" }}
            >
              찾기
            </button>
          </div>
          {pathError && <p style={{ color: "var(--ig-danger)", fontSize: 13, margin: 0 }}>{pathError}</p>}
          {path && path.length > 0 && (
            <div
              className="ig-fade-in"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 6,
              }}
            >
              {path.map((u, i) => (
                <div key={`${u}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    onClick={onOpenProfile ? () => onOpenProfile(u) : undefined}
                    style={{ display: "flex", alignItems: "center", gap: 6, cursor: onOpenProfile ? "pointer" : "default" }}
                  >
                    <Avatar username={u} size={32} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{u}</span>
                  </div>
                  {i < path.length - 1 && <span style={{ color: "var(--ig-text-muted)" }}>→</span>}
                </div>
              ))}
              <span style={{ color: "var(--ig-text-muted)", fontSize: 13, marginLeft: 8 }}>
                ({path.length - 1}촌)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
