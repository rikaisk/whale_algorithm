import { useState, useEffect } from "react";
import type { Post, Comment } from "../api/client";
import { likePost, getComments, createComment, createReply, deleteComment } from "../api/client";
import Avatar from "./Avatar";

function relativeTime(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(ts * 1000).toLocaleDateString("ko-KR");
}

function CommentNode({
  comment,
  currentUserId,
  currentUsername,
  currentAvatar,
  onDelete,
  onChanged,
  onOpenProfile,
}: {
  comment: Comment;
  currentUserId: string;
  currentUsername: string;
  currentAvatar?: string | null;
  onDelete: (id: string) => void;
  onChanged?: () => void;
  onOpenProfile?: (username: string) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const authorName = comment.author_username ?? comment.author_id.slice(0, 8);
  const replies = comment.replies ?? [];

  const submitReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    await createReply(comment.id, text);
    setReplyText("");
    setShowReply(false);
    onChanged?.();
  };

  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 0", marginLeft: comment.parent_id ? 12 : 0 }}>
      <Avatar
        username={authorName}
        size={28}
        src={comment.author_id === currentUserId ? currentAvatar ?? null : undefined}
        onClick={onOpenProfile ? () => onOpenProfile(authorName) : undefined}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.45 }}>
          <span
            onClick={onOpenProfile ? () => onOpenProfile(authorName) : undefined}
            style={{ fontWeight: 600, cursor: onOpenProfile ? "pointer" : "default" }}
          >
            {authorName}
          </span>{" "}
          <span style={{ color: "var(--ig-text)" }}>{comment.content}</span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "var(--ig-text-muted)" }}>
          <span>{relativeTime(comment.created_at)}</span>
          <button onClick={() => setShowReply(!showReply)} style={{ fontWeight: 600, color: "var(--ig-text-muted)", fontSize: 12 }}>
            답글 달기
          </button>
          {comment.author_id === currentUserId && (
            <button onClick={() => onDelete(comment.id)} style={{ fontWeight: 600, color: "var(--ig-text-muted)", fontSize: 12 }}>
              삭제
            </button>
          )}
        </div>
        {showReply && (
          <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
            <input
              className="ig-input"
              style={{ padding: "5px 10px", fontSize: 12 }}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`@${authorName} 에게 답글...`}
              onKeyDown={(e) => e.key === "Enter" && submitReply()}
            />
            <button
              onClick={submitReply}
              disabled={!replyText.trim()}
              title="답글 게시"
              style={{
                background: replyText.trim() ? "var(--ig-accent)" : "#e0e0e0",
                color: "#fff",
                width: 26,
                height: 26,
                flexShrink: 0,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 700,
                cursor: replyText.trim() ? "pointer" : "default",
                transition: "background 0.15s",
              }}
            >
              ↑
            </button>
          </div>
        )}
        {replies.map((r) => (
          <CommentNode
            key={r.id}
            comment={r}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            currentAvatar={currentAvatar}
            onDelete={onDelete}
            onChanged={onChanged}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>
    </div>
  );
}

export default function PostCard({
  post,
  currentUserId,
  currentUsername,
  currentAvatar,
  onDelete,
  onOpenProfile,
}: {
  post: Post;
  currentUserId: string;
  currentUsername?: string;
  currentAvatar?: string | null;
  onDelete?: (id: string) => void;
  onOpenProfile?: (username: string) => void;
}) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(Boolean(post.liked_by_me));
  const [popping, setPopping] = useState(false);
  const [likeHover, setLikeHover] = useState(false);
  const [commentHover, setCommentHover] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [imgError, setImgError] = useState(false);
  const authorName = post.author_username ?? post.author_id.slice(0, 8);
  const isMine = post.author_id === currentUserId;

  const handleLike = async () => {
    setPopping(true);
    setTimeout(() => setPopping(false), 350);
    const res = await likePost(post.id);
    setLikes(res.likes);
    setLiked(res.liked_by_me);
  };

  const refreshComments = async () => {
    try {
      setComments(await getComments(post.id));
    } catch {
      /* 무시 */
    }
  };

  const loadComments = async () => {
    if (!showComments) {
      await refreshComments();
    }
    setShowComments(!showComments);
  };

  // 댓글이 펼쳐져 있는 동안 이벤트 없이도 실시간(폴링) 갱신
  useEffect(() => {
    if (!showComments) return;
    const id = window.setInterval(refreshComments, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments, post.id]);

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    await createComment(post.id, text);
    setCommentText("");
    if (!showComments) setShowComments(true);
    await refreshComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    await refreshComments();
  };

  const heartColor = liked || likeHover ? "var(--ig-danger)" : "var(--ig-text)";
  const heartGlyph = liked || likeHover ? "♥" : "♡";

  const actionBtnStyle: React.CSSProperties = {
    border: "1.5px solid #000",
    borderRadius: 8,
    width: 44,
    height: 36,
    fontSize: 20,
    background: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.15s",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
  };

  return (
    <article
      className="ig-card"
      style={{ marginBottom: 20, maxWidth: 470, marginLeft: "auto", marginRight: "auto" }}
    >
      <header style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 10 }}>
        <Avatar
          username={authorName}
          size={32}
          ring
          onClick={onOpenProfile ? () => onOpenProfile(authorName) : undefined}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={onOpenProfile ? () => onOpenProfile(authorName) : undefined}
            style={{ fontWeight: 600, fontSize: 14, cursor: onOpenProfile ? "pointer" : "default" }}
          >
            {authorName}
          </div>
        </div>
        {isMine && onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            title="삭제"
            style={{ color: "var(--ig-text-muted)", fontSize: 18 }}
          >
            ⋯
          </button>
        )}
      </header>

      {post.image_base64 && !imgError && (
        <div style={{ background: "#000", display: "flex", justifyContent: "center" }}>
          <img
            src={post.image_base64}
            alt="post"
            loading="lazy"
            onError={() => setImgError(true)}
            style={{ width: "100%", maxHeight: 600, objectFit: "contain" }}
          />
        </div>
      )}

      <div style={{ padding: "10px 14px 6px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <button
            onClick={handleLike}
            onMouseEnter={() => setLikeHover(true)}
            onMouseLeave={() => setLikeHover(false)}
            className={popping ? "ig-heart-pop" : ""}
            style={{
              ...actionBtnStyle,
              color: heartColor,
            }}
            title="좋아요"
          >
            {heartGlyph}
          </button>
          <button
            onClick={loadComments}
            onMouseEnter={() => setCommentHover(true)}
            onMouseLeave={() => setCommentHover(false)}
            style={actionBtnStyle}
            title="댓글"
          >
            <span
              style={{
                display: "inline-block",
                filter: commentHover ? "brightness(0)" : "none",
                transition: "filter 0.15s",
              }}
            >
              💬
            </span>
          </button>
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
          좋아요 {likes.toLocaleString()}개
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
          <span
            onClick={onOpenProfile ? () => onOpenProfile(authorName) : undefined}
            style={{ fontWeight: 600, marginRight: 6, cursor: onOpenProfile ? "pointer" : "default" }}
          >
            {authorName}
          </span>
          {post.content}
        </div>
        {post.hashtags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {post.hashtags.map((t) => (
              <span key={t} style={{ color: "var(--ig-accent)", fontSize: 14 }}>
                #{t}
              </span>
            ))}
          </div>
        )}
        {post.comment_count > 0 && !showComments && (
          <button
            onClick={loadComments}
            style={{ color: "var(--ig-text-muted)", fontSize: 14, marginTop: 6 }}
          >
            댓글 {post.comment_count}개 모두 보기
          </button>
        )}
        <div style={{ color: "var(--ig-text-muted)", fontSize: 11, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {relativeTime(post.created_at)}
        </div>
      </div>

      {showComments && (
        <div className="ig-fade-in" style={{ padding: "0 14px 10px", borderTop: "1px solid var(--ig-border-soft)" }}>
          <div style={{ paddingTop: 8 }}>
            {comments.map((c) => (
              <CommentNode
                key={c.id}
                comment={c}
                currentUserId={currentUserId}
                currentUsername={currentUsername ?? ""}
                currentAvatar={currentAvatar}
                onDelete={handleDeleteComment}
                onChanged={refreshComments}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "10px 14px",
          borderTop: "1px solid var(--ig-border-soft)",
          alignItems: "center",
        }}
      >
        <input
          className="ig-input"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="댓글 달기..."
          style={{ border: "none", background: "transparent", padding: 0, fontSize: 14 }}
          onKeyDown={(e) => e.key === "Enter" && submitComment()}
        />
        <button
          onClick={submitComment}
          disabled={!commentText.trim()}
          title="댓글 게시"
          style={{
            background: commentText.trim() ? "var(--ig-accent)" : "#e0e0e0",
            color: "#fff",
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            cursor: commentText.trim() ? "pointer" : "default",
            transition: "background 0.15s",
          }}
        >
          ↑
        </button>
      </div>
    </article>
  );
}
