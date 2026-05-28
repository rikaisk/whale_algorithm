import { useState, useEffect } from "react";
import type { User, Post } from "../api/client";
import { getProfile, updateBio, getUserFeed, followUser, unfollowUser } from "../api/client";
import PostCard from "../components/PostCard";

export default function ProfilePage({
  targetUsername,
  currentUsername,
  currentUserId,
}: {
  targetUsername: string;
  currentUsername: string;
  currentUserId: string;
}) {
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editBio, setEditBio] = useState(false);
  const [bio, setBio] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const p = await getProfile(targetUsername);
      setProfile(p);
      setBio(p.bio);
    } catch {
      setError("프로필을 불러오지 못했습니다.");
    }
    try {
      const feed = await getUserFeed(targetUsername);
      setPosts(feed);
    } catch {
      // feed is optional
    }
  };

  useEffect(() => { load(); }, [targetUsername]);

  useEffect(() => {
    if (!profile || !currentUserId) return;
    // Check if currentUser follows this profile
    // We rely on the profile's followers to determine this — not directly available,
    // so we do a best-effort check by trying follow and catching 409.
    setIsFollowing(false); // reset; updated after follow/unfollow
  }, [profile]);

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

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await unfollowUser(currentUsername, targetUsername);
        setIsFollowing(false);
      } else {
        await followUser(currentUsername, targetUsername);
        setIsFollowing(true);
      }
      await load();
    } catch (e: any) {
      if (e?.response?.status === 409) setIsFollowing(true);
    }
  };

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!profile) return <p>불러오는 중...</p>;

  const isSelf = currentUsername === targetUsername;

  return (
    <div>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, marginBottom: 20, background: "#fff" }}>
        <h2 style={{ margin: "0 0 8px" }}>@{profile.username}</h2>
        {editBio ? (
          <div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={saveBio} style={{ padding: "4px 12px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>저장</button>
              <button onClick={() => setEditBio(false)} style={{ padding: "4px 12px", cursor: "pointer" }}>취소</button>
            </div>
          </div>
        ) : (
          <p style={{ color: "#555", marginBottom: 8 }}>{profile.bio}</p>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {profile.interests.map((t) => (
            <span key={t} style={{ background: "#e8f5e9", color: "#2e7d32", borderRadius: 12, padding: "2px 8px", fontSize: 12 }}>
              {t}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 20, color: "#555", fontSize: 14, marginBottom: 12 }}>
          <span>게시글 <b>{profile.post_count}</b></span>
          <span>팔로워 <b>{profile.followers_count}</b></span>
          <span>팔로잉 <b>{profile.following_count}</b></span>
        </div>
        {isSelf ? (
          <button onClick={() => setEditBio(true)} style={{ padding: "4px 12px", cursor: "pointer" }}>소개글 수정</button>
        ) : (
          <button
            onClick={handleFollow}
            style={{ padding: "4px 12px", background: isFollowing ? "#eee" : "#1a73e8", color: isFollowing ? "#333" : "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            {isFollowing ? "팔로우 취소" : "팔로우"}
          </button>
        )}
      </div>
      <h3>팔로잉 피드</h3>
      {posts.length === 0 ? (
        <p style={{ color: "#888" }}>표시할 게시글이 없습니다.</p>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} currentUserId={currentUserId} />)
      )}
    </div>
  );
}
