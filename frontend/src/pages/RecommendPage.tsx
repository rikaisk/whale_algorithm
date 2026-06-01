import { useEffect, useState } from "react";
import type { Post, ClosestPerson } from "../api/client";
import {
  recommendPosts,
  recommendPeople,
  recommendClosest,
  followUser,
} from "../api/client";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import { useIsMobile } from "../hooks/useIsMobile";

type Tab = "posts" | "people" | "closest";

interface PostSection {
  reason: string;
  title: string;
  posts: Post[];
}
interface PersonItem {
  user_id: string;
  username: string;
  is_ai?: boolean;
  bio?: string;
  common_friends?: number;
}
interface PeopleSection {
  reason: string;
  title: string;
  people: PersonItem[];
}

export default function RecommendPage({
  username,
  userId,
  currentAvatar,
  onOpenProfile,
}: {
  username: string;
  userId: string;
  currentAvatar?: string | null;
  onOpenProfile?: (username: string) => void;
}) {
  const [postSections, setPostSections] = useState<PostSection[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [peopleSections, setPeopleSections] = useState<PeopleSection[]>([]);
  const [closest, setClosest] = useState<ClosestPerson[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const isMobile = useIsMobile();

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await recommendPosts(username);
      setPostSections(res.sections || []);
      setInterests(res.interests || []);
    } finally {
      setLoading(false);
    }
  };

  const loadPeople = async () => {
    setLoading(true);
    try {
      const res = await recommendPeople(username);
      setPeopleSections(res.sections || []);
    } finally {
      setLoading(false);
    }
  };

  const loadClosest = async () => {
    setLoading(true);
    try {
      const res = await recommendClosest(username);
      setClosest(res.results || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadedTabs.has(activeTab)) return;
    setLoadedTabs((prev) => new Set(prev).add(activeTab));
    if (activeTab === "posts") loadPosts();
    if (activeTab === "people") loadPeople();
    if (activeTab === "closest") loadClosest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleFollow = async (target: string) => {
    try {
      await followUser(username, target);
      setFollowed((prev) => new Set(prev).add(target));
    } catch {}
  };

  const tabBtn = (id: Tab, label: string) => {
    const active = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        style={{
          padding: isMobile ? "10px 8px" : "10px 18px",
          borderBottom: active ? "2px solid var(--ig-text)" : "2px solid transparent",
          color: active ? "var(--ig-text)" : "var(--ig-text-muted)",
          fontWeight: active ? 700 : 600,
          fontSize: 13,
          letterSpacing: 0.5,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {label}
      </button>
    );
  };

  const sectionHeader = (title: string) => (
    <div
      style={{
        fontWeight: 700,
        fontSize: 14,
        color: "var(--ig-text)",
        padding: "0 4px 8px",
        marginTop: 4,
      }}
    >
      {title}
    </div>
  );

  const personRow = (u: PersonItem) => {
    const isFollowed = followed.has(u.username);
    return (
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
            style={{
              fontWeight: 600,
              fontSize: 14,
              cursor: onOpenProfile ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {u.username}
            {u.is_ai && (
              <span className="ig-chip ig-chip-tag" style={{ fontSize: 10 }}>
                AI
              </span>
            )}
          </div>
          <div
            style={{
              color: "var(--ig-text-muted)",
              fontSize: 12,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {typeof u.common_friends === "number"
              ? `공통 친구 ${u.common_friends}명`
              : u.bio || ""}
          </div>
        </div>
        <button
          onClick={() => handleFollow(u.username)}
          disabled={isFollowed}
          className={isFollowed ? "ig-btn-secondary" : "ig-btn-primary"}
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          {isFollowed ? "팔로잉" : "팔로우"}
        </button>
      </div>
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
          gap: isMobile ? 6 : 24,
          overflowX: "auto",
        }}
      >
        {tabBtn("posts", "✨ 게시물")}
        {tabBtn("people", "👥 사람")}
        {tabBtn("closest", "🧭 가까운 친구")}
      </div>

      {activeTab === "posts" && (
        <>
          {interests.length > 0 && (
            <div
              className="ig-card"
              style={{ padding: 12, marginBottom: 14, background: "#f0fdf4", borderColor: "#bbf7d0" }}
            >
              <div style={{ color: "#15803d", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                💚 내 관심 분야
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
          ) : postSections.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--ig-text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🤔</div>
              <p style={{ margin: 0 }}>아직 추천할 게시물이 없습니다.</p>
            </div>
          ) : (
            postSections.map((sec) => (
              <div key={sec.reason + sec.title} style={{ marginBottom: 12 }}>
                {sectionHeader(sec.title)}
                {sec.posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    currentUserId={userId}
                    currentUsername={username}
                    currentAvatar={currentAvatar}
                    onOpenProfile={onOpenProfile}
                  />
                ))}
              </div>
            ))
          )}
        </>
      )}

      {activeTab === "people" && (
        <>
          {loading ? (
            <p style={{ padding: 40, textAlign: "center", color: "var(--ig-text-muted)" }}>분석 중...</p>
          ) : peopleSections.length === 0 ? (
            <p style={{ padding: 40, textAlign: "center", color: "var(--ig-text-muted)" }}>
              추천할 사람이 없습니다.
            </p>
          ) : (
            peopleSections.map((sec) => (
              <div key={sec.reason + sec.title} className="ig-card" style={{ marginBottom: 16 }}>
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--ig-border-soft)",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {sec.title}
                </div>
                {sec.people.map((u) => personRow(u))}
              </div>
            ))
          )}
        </>
      )}

      {activeTab === "closest" && (
        <div>
          <div
            className="ig-card"
            style={{ padding: 14, marginBottom: 14, background: "#eef2ff", borderColor: "#c7d2fe" }}
          >
            <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#3730a3" }}>
              🧭 가까운 친구 찾기 (Dijkstra)
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#4338ca", lineHeight: 1.5 }}>
              팔로우 관계를 따라, <b>공통 관심사가 많을수록 가까운 사이</b>로 보는 가중치로
              나와의 최단 거리를 계산해 가장 가까운 사람부터 추천해요.
            </p>
          </div>
          {loading ? (
            <p style={{ padding: 40, textAlign: "center", color: "var(--ig-text-muted)" }}>계산 중...</p>
          ) : closest.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--ig-text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🧭</div>
              <p style={{ margin: "0 0 4px" }}>아직 연결된 사람이 없어요.</p>
              <p style={{ margin: 0, fontSize: 13 }}>
                누군가를 팔로우하면 그 친구의 친구들까지 거리순으로 추천해드려요.
              </p>
            </div>
          ) : (
            <div className="ig-card">
              {closest.map((c, i) => {
                const isFollowed = followed.has(c.username);
                return (
                  <div
                    key={c.user_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderTop: i === 0 ? "none" : "1px solid var(--ig-border-soft)",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        borderRadius: "50%",
                        background: "var(--ig-grad-cta)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {i + 1}
                    </div>
                    <Avatar
                      username={c.username}
                      size={44}
                      onClick={onOpenProfile ? () => onOpenProfile(c.username) : undefined}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        onClick={onOpenProfile ? () => onOpenProfile(c.username) : undefined}
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: onOpenProfile ? "pointer" : "default",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {c.username}
                        {c.is_ai && (
                          <span className="ig-chip ig-chip-tag" style={{ fontSize: 10 }}>
                            AI
                          </span>
                        )}
                      </div>
                      <div style={{ color: "var(--ig-text-muted)", fontSize: 12, marginTop: 2 }}>
                        {c.hops}촌 · 친밀도 거리 {c.distance}
                        {c.shared_interests.length > 0 && (
                          <> · 공통 관심사 {c.shared_interests.join(", ")}</>
                        )}
                      </div>
                      <div
                        style={{
                          color: "var(--ig-text-muted)",
                          fontSize: 11,
                          marginTop: 3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        경로: {c.path.join(" → ")}
                      </div>
                    </div>
                    <button
                      onClick={() => handleFollow(c.username)}
                      disabled={isFollowed}
                      className={isFollowed ? "ig-btn-secondary" : "ig-btn-primary"}
                      style={{ padding: "6px 14px", fontSize: 13, flexShrink: 0 }}
                    >
                      {isFollowed ? "팔로잉" : "팔로우"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
