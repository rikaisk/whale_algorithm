import { useState, useEffect } from "react";
import type { User, Post } from "../api/client";
import {
  getProfile,
  updateBio,
  getUserPosts,
  followUser,
  unfollowUser,
  getMe,
} from "../api/client";
import Avatar from "../components/Avatar";
import PostCard from "../components/PostCard";

export default function ProfilePage({
  targetUsername,
  currentUsername,
  currentUserId,
  onOpenProfile,
}: {
  targetUsername: string;
  currentUsername: string;
  currentUserId: string;
  onOpenProfile?: (username: string) => void;
}) {
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editBio, setEditBio] = useState(false);
  const [bio, setBio] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [openedPost, setOpenedPost] = useState<Post | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isSelf = currentUsername === targetUsername;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [p, my, userPosts] = await Promise.all([
        getProfile(targetUsername),
        getMe().catch(() => null),
        getUserPosts(targetUsername).catch(() => []),
      ]);
      setProfile(p);
      setBio(p.bio);
      setPosts(userPosts);
      if (my) {
        setIsFollowing(my.following.includes(p.id));
      }
    } catch {
      setError("프로필을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setOpenedPost(null);
  }, [targetUsername]);

  const saveBio = async () => {
    if (!bio.trim()) return;
    try {
      await updateBio(targetUsername, bio);
      setEditBio(false);
      await load();
    } catch {
      setError("소개글 수정에 실패했습니다.");
    }
  };

  const toggleFollow = async () => {
    if (!profile) return;
    try {
      if (isFollowing) {
        await unfollowUser(currentUsername, targetUsername);
        setIsFollowing(false);
        setProfile({ ...profile, followers_count: Math.max(0, profile.followers_count - 1) });
      } else {
        await followUser(currentUsername, targetUsername);
        setIsFollowing(true);
        setProfile({ ...profile, followers_count: profile.followers_count + 1 });
      }
    } catch (e: any) {
      if (e?.response?.status === 409) setIsFollowing(true);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--ig-text-muted)" }}>불러오는 중...</div>;
  if (error) return <p style={{ color: "var(--ig-danger)", textAlign: "center" }}>{error}</p>;
  if (!profile) return null;

  return (
    <div style={{ maxWidth: 740, margin: "0 auto" }}>
      <section style={{ display: "flex", gap: 36, padding: "20px 16px 32px", alignItems: "flex-start" }}>
        <Avatar username={profile.username} size={150} ring />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontWeight: 300, fontSize: 28 }}>{profile.username}</h2>
            {isSelf ? (
              <button className="ig-btn-secondary" onClick={() => setEditBio(true)}>
                프로필 편집
              </button>
            ) : (
              <button
                className={isFollowing ? "ig-btn-secondary" : "ig-btn-primary"}
                onClick={toggleFollow}
              >
                {isFollowing ? "팔로잉" : "팔로우"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 32, marginBottom: 18, fontSize: 16 }}>
            <span>
              게시물 <b>{profile.post_count}</b>
            </span>
            <span>
              팔로워 <b>{profile.followers_count}</b>
            </span>
            <span>
              팔로잉 <b>{profile.following_count}</b>
            </span>
          </div>
          {editBio ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                className="ig-input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                style={{ resize: "vertical", minHeight: 60 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="ig-btn-primary" onClick={saveBio} style={{ padding: "6px 14px" }}>
                  저장
                </button>
                <button className="ig-btn-secondary" onClick={() => { setEditBio(false); setBio(profile.bio); }}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p style={{ margin: "0 0 8px", fontSize: 14, whiteSpace: "pre-wrap" }}>
              {profile.bio || <span style={{ color: "var(--ig-text-muted)" }}>(소개글 없음)</span>}
            </p>
          )}
          {profile.interests.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {profile.interests.map((t) => (
                <span key={t} className="ig-chip ig-chip-tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div
        style={{
          borderTop: "1px solid var(--ig-border)",
          paddingTop: 14,
          marginBottom: 14,
          textAlign: "center",
          letterSpacing: 1,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ig-text)",
        }}
      >
        ▦ 게시물
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: "var(--ig-text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📷</div>
          <p style={{ margin: 0 }}>아직 게시물이 없습니다.</p>
        </div>
      ) : openedPost ? (
        <div style={{ maxWidth: 470, margin: "0 auto" }}>
          <button
            onClick={() => setOpenedPost(null)}
            style={{ color: "var(--ig-text-muted)", fontSize: 13, marginBottom: 10 }}
          >
            ← 그리드로 돌아가기
          </button>
          <PostCard
            post={openedPost}
            currentUserId={currentUserId}
            onOpenProfile={onOpenProfile}
          />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 3,
          }}
        >
          {posts.map((p) => (
            <button
              key={p.id}
              onClick={() => setOpenedPost(p)}
              style={{
                aspectRatio: "1 / 1",
                background: p.image_base64 ? "#000" : "linear-gradient(135deg, #fafafa, #efefef)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: p.image_base64 ? 0 : 14,
                position: "relative",
              }}
            >
              {p.image_base64 ? (
                <img
                  src={p.image_base64}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ig-text)",
                    textAlign: "left",
                    width: "100%",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {p.content}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
