import { useState, useEffect, useRef } from "react";
import type { User, Post, UserMini } from "../api/client";
import {
  getProfile,
  updateBio,
  getUserPosts,
  followUser,
  unfollowUser,
  getMe,
  updateAvatar,
  getFollowers,
  getFollowing,
} from "../api/client";
import Avatar from "../components/Avatar";
import PostCard from "../components/PostCard";
import { useIsMobile } from "../hooks/useIsMobile";

const MAX_AVATAR_BYTES = 1_000_000;

export default function ProfilePage({
  targetUsername,
  currentUsername,
  currentUserId,
  currentAvatar,
  onOpenProfile,
  onOpenChat,
}: {
  targetUsername: string;
  currentUsername: string;
  currentUserId: string;
  currentAvatar?: string | null;
  onOpenProfile?: (username: string) => void;
  onOpenChat?: (username: string) => void;
}) {
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editBio, setEditBio] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [openedPost, setOpenedPost] = useState<Post | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState<"followers" | "following" | null>(null);
  const [listItems, setListItems] = useState<UserMini[]>([]);
  const [failedImgs, setFailedImgs] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isMobile = useIsMobile();

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
      setAvatarDraft(p.avatar_base64 ?? null);
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

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setError("프로필 사진은 1MB 이하만 가능합니다.");
      e.target.value = "";
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setAvatarDraft(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => setAvatarDraft(null);

  const saveProfile = async () => {
    if (!profile) return;
    setSavingAvatar(true);
    try {
      if (bio.trim() && bio !== profile.bio) {
        await updateBio(targetUsername, bio);
      }
      if (avatarDraft !== (profile.avatar_base64 ?? null)) {
        await updateAvatar(targetUsername, avatarDraft);
      }
      setEditBio(false);
      await load();
    } catch {
      setError("프로필 저장에 실패했습니다.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const cancelEdit = () => {
    if (!profile) return;
    setEditBio(false);
    setBio(profile.bio);
    setAvatarDraft(profile.avatar_base64 ?? null);
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
  if (error && !profile) return <p style={{ color: "var(--ig-danger)", textAlign: "center" }}>{error}</p>;
  if (!profile) return null;

  return (
    <div style={{ maxWidth: 740, margin: "0 auto" }}>
      <section style={{ display: "flex", gap: isMobile ? 18 : 36, padding: isMobile ? "12px 6px 24px" : "20px 16px 32px", alignItems: "flex-start" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            username={profile.username}
            size={isMobile ? 84 : 150}
            ring
            src={editBio ? avatarDraft : profile.avatar_base64 ?? null}
          />
          {editBio && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, alignItems: "center" }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onAvatarFile}
                style={{ display: "none" }}
              />
              <button
                className="ig-btn-secondary"
                style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={() => fileRef.current?.click()}
              >
                사진 변경
              </button>
              {avatarDraft && (
                <button
                  onClick={removeAvatar}
                  style={{ color: "var(--ig-danger)", fontSize: 12, fontWeight: 600 }}
                >
                  사진 제거
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontWeight: 300, fontSize: isMobile ? 20 : 28, wordBreak: "break-all" }}>{profile.username}</h2>
            {profile.is_ai && (
              <span
                className="ig-chip"
                style={{ background: "linear-gradient(135deg,#4f5bd5,#962fbf)", color: "#fff", fontSize: 11 }}
              >
                🤖 AI
              </span>
            )}
            {isSelf ? (
              editBio ? (
                <>
                  <button
                    className="ig-btn-primary"
                    onClick={saveProfile}
                    disabled={savingAvatar}
                    style={{ padding: "6px 14px" }}
                  >
                    {savingAvatar ? "저장 중..." : "저장"}
                  </button>
                  <button className="ig-btn-secondary" onClick={cancelEdit}>
                    취소
                  </button>
                </>
              ) : (
                <button className="ig-btn-secondary" onClick={() => setEditBio(true)}>
                  프로필 편집
                </button>
              )
            ) : (
              <>
                <button
                  className={isFollowing ? "ig-btn-secondary" : "ig-btn-primary"}
                  onClick={toggleFollow}
                >
                  {isFollowing ? "팔로잉" : "팔로우"}
                </button>
                <button
                  className="ig-btn-secondary"
                  onClick={() => onOpenChat?.(targetUsername)}
                  title={`${targetUsername}님에게 메시지 보내기`}
                >
                  메시지 보내기
                </button>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, fontSize: 16 }}>
            <span className="ig-stat-btn" style={{ cursor: "default" }}>
              게시물 <b>{profile.post_count}</b>
            </span>
            <button
              onClick={async () => {
                const list = await getFollowers(targetUsername);
                setListItems(list);
                setShowList("followers");
              }}
              className="ig-stat-btn"
            >
              팔로워 <b>{profile.followers_count}</b>
            </button>
            <button
              onClick={async () => {
                const list = await getFollowing(targetUsername);
                setListItems(list);
                setShowList("following");
              }}
              className="ig-stat-btn"
            >
              팔로잉 <b>{profile.following_count}</b>
            </button>
          </div>
          {editBio ? (
            <textarea
              className="ig-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              style={{ resize: "vertical", minHeight: 60 }}
            />
          ) : (
            <p style={{ margin: "0 0 8px", fontSize: 14, whiteSpace: "pre-wrap" }}>
              {profile.bio || <span style={{ color: "var(--ig-text-muted)" }}>(소개글 없음)</span>}
            </p>
          )}
          {profile.interests.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {profile.interests.map((t) => (
                <span key={t} className="ig-chip ig-chip-tag">
                  {t}
                </span>
              ))}
            </div>
          )}
          {error && <p style={{ color: "var(--ig-danger)", fontSize: 13, marginTop: 8 }}>{error}</p>}
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
            ← 돌아가기
          </button>
          <PostCard
            post={openedPost}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            currentAvatar={currentAvatar}
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
          {posts.map((p) => {
            const hasImg = !!p.image_base64 && !failedImgs.has(p.id);
            return (
            <button
              key={p.id}
              onClick={() => setOpenedPost(p)}
              style={{
                aspectRatio: "1 / 1",
                background: hasImg ? "#000" : "linear-gradient(135deg, #fafafa, #efefef)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: hasImg ? 0 : 14,
                position: "relative",
              }}
            >
              {hasImg ? (
                <img
                  src={p.image_base64!}
                  alt=""
                  loading="lazy"
                  onError={() =>
                    setFailedImgs((prev) => new Set(prev).add(p.id))
                  }
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
            );
          })}
        </div>
      )}

      {showList && (
        <div
          onClick={() => setShowList(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="ig-card"
            style={{
              width: "100%",
              maxWidth: 400,
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <header
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--ig-border)",
                fontWeight: 700,
                textAlign: "center",
                position: "relative",
              }}
            >
              {showList === "followers" ? "팔로워" : "팔로잉"}
              <button
                onClick={() => setShowList(null)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 18,
                  color: "var(--ig-text-muted)",
                }}
              >
                ✕
              </button>
            </header>
            <div className="ig-scrollbar" style={{ overflowY: "auto", flex: 1 }}>
              {listItems.length === 0 ? (
                <p style={{ textAlign: "center", padding: 30, color: "var(--ig-text-muted)" }}>
                  {showList === "followers" ? "팔로워가 없습니다." : "팔로잉이 없습니다."}
                </p>
              ) : (
                listItems.map((u) => (
                  <button
                    key={u.username}
                    onClick={() => {
                      setShowList(null);
                      onOpenProfile?.(u.username);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 16px",
                      width: "100%",
                      textAlign: "left",
                      borderTop: "1px solid var(--ig-border-soft)",
                    }}
                  >
                    <Avatar username={u.username} size={40} src={u.avatar_base64} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</div>
                      {u.bio && (
                        <div
                          style={{
                            color: "var(--ig-text-muted)",
                            fontSize: 12,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {u.bio}
                        </div>
                      )}
                    </div>
                    {u.is_ai && <span className="ig-chip ig-chip-tag" style={{ fontSize: 10 }}>AI</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
