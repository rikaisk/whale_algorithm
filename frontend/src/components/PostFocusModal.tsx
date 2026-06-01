import { useEffect, useState } from "react";
import type { Post } from "../api/client";
import { getPost } from "../api/client";
import PostCard from "./PostCard";

// 알림 클릭 시 알림의 근원지(게시물 + 해당 댓글)를 모달로 띄워 보여준다.
export default function PostFocusModal({
  postId,
  commentId,
  currentUserId,
  currentUsername,
  currentAvatar,
  onOpenProfile,
  onClose,
}: {
  postId: string;
  commentId: string | null;
  currentUserId: string;
  currentUsername: string;
  currentAvatar?: string | null;
  onOpenProfile?: (username: string) => void;
  onClose: () => void;
}) {
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setPost(null);
    setError("");
    getPost(postId)
      .then((p) => {
        if (alive) setPost(p);
      })
      .catch(() => {
        if (alive) setError("게시물을 찾을 수 없습니다. 삭제되었을 수 있어요.");
      });
    return () => {
      alive = false;
    };
  }, [postId]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1200,
        padding: "44px 16px 24px",
        overflowY: "auto",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, position: "relative" }}>
        <button
          onClick={onClose}
          title="닫기"
          style={{
            position: "absolute",
            top: -34,
            right: 0,
            color: "#fff",
            fontSize: 26,
            lineHeight: 1,
            zIndex: 2,
          }}
        >
          ✕
        </button>
        {error ? (
          <div className="ig-card" style={{ padding: 30, textAlign: "center", color: "var(--ig-text-muted)" }}>
            {error}
          </div>
        ) : !post ? (
          <div className="ig-card" style={{ padding: 30, textAlign: "center", color: "var(--ig-text-muted)" }}>
            불러오는 중...
          </div>
        ) : (
          <PostCard
            post={post}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            currentAvatar={currentAvatar}
            onOpenProfile={onOpenProfile}
            defaultShowComments
            highlightCommentId={commentId}
          />
        )}
      </div>
    </div>
  );
}
