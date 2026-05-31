import { useState, useEffect, useRef } from "react";
import type { Post } from "../api/client";
import { getFeed, createPost, deletePost } from "../api/client";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";

const MAX_IMAGE_BYTES = 1_000_000;

export default function FeedPage({
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imageName, setImageName] = useState<string>("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setRefreshing(true);
    try {
      const data = await getFeed(username);
      setPosts(data);
    } catch {
      setError("피드를 불러오지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [username]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageBase64(undefined);
      setImageName("");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("이미지가 1MB를 초과합니다.");
      e.target.value = "";
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(undefined);
    setImageName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await createPost(content, imageBase64);
      setContent("");
      clearImage();
      setComposerOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "게시물 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (post_id: string) => {
    await deletePost(post_id);
    setPosts((prev) => prev.filter((p) => p.id !== post_id));
  };

  return (
    <div style={{ maxWidth: 470, margin: "0 auto" }}>
      <div
        className="ig-card"
        style={{ marginBottom: 20, padding: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar username={username} size={40} ring src={currentAvatar} />
          <button
            onClick={() => setComposerOpen(!composerOpen)}
            style={{
              flex: 1,
              textAlign: "left",
              color: "var(--ig-text-muted)",
              padding: "10px 14px",
              borderRadius: 24,
              background: "#fafafa",
              border: "1px solid var(--ig-border)",
              fontSize: 14,
            }}
          >
            {composerOpen ? "닫기" : `${username}님, 무슨 생각을 하고 계신가요?`}
          </button>
        </div>
        {composerOpen && (
          <div className="ig-fade-in" style={{ marginTop: 12 }}>
            <textarea
              className="ig-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="내용을 입력하세요..."
              style={{ resize: "vertical", minHeight: 70 }}
            />
            {imageBase64 && (
              <div style={{ marginTop: 10, position: "relative" }}>
                <img
                  src={imageBase64}
                  alt="preview"
                  style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 8 }}
                />
                <button
                  onClick={clearImage}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    fontSize: 14,
                  }}
                  title="이미지 제거"
                >
                  ✕
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  color: "var(--ig-text-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  style={{ display: "none" }}
                />
                🖼️ 사진 추가
              </label>
              {imageName && (
                <span style={{ color: "var(--ig-text-muted)", fontSize: 12 }}>{imageName}</span>
              )}
              <button
                className="ig-btn-primary"
                style={{ marginLeft: "auto", padding: "7px 18px" }}
                disabled={loading || !content.trim()}
                onClick={submit}
              >
                {loading ? "게시 중..." : "게시"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            background: "#fee",
            color: "var(--ig-danger)",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {refreshing && posts.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--ig-text-muted)", padding: 40 }}>불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div
          className="ig-card"
          style={{ padding: 40, textAlign: "center", color: "var(--ig-text-muted)" }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 16, color: "var(--ig-text)" }}>
            아직 피드가 비어있어요
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            추천 탭에서 팔로우할 사람을 찾아보세요.
          </p>
        </div>
      ) : (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            currentUserId={userId}
            currentUsername={username}
            currentAvatar={currentAvatar}
            onDelete={p.author_id === userId ? handleDelete : undefined}
            onOpenProfile={onOpenProfile}
          />
        ))
      )}
    </div>
  );
}
