import { useState } from "react";
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
  onDelete,
  onOpenProfile,
}: {
  comment: Comment;
  currentUserId: string;
  onDelete: (id: string) => void;
  onOpenProfile?: (username: string) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [replies, setReplies] = useState(comment.replies);
  const authorName = comment.author_username ?? comment.author_id.slice(0, 8);

  const submitReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    const res = await createReply(comment.id, text);
    setReplies((prev) => [
      ...prev,
      {
        id: res.id,
        post_id: comment.post_id,
        author_id: currentUserId,
        author_username: undefined,
        content: text,
        parent_id: comment.id,
        created_at: res.created_at,
        replies: [],
      },
    ]);
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 0", marginLeft: comment.parent_id ? 24 : 0 }}>
      <Avatar username={authorName} size={28} onClick={onOpenProfile ? () => onOpenProfile(authorName) : undefined} />
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
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input
              className="ig-input"
              style={{ padding: "5px 10px", fontSize: 12 }}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`@${authorName} 에게 답글...`}
              onKeyDown={(e) => e.key === "Enter" && submitReply()}
            />
            <button onClick={submitReply} style={{ color: "var(--ig-accent)", fontWeight: 600, fontSize: 13 }}>
              게시
            </button>
          </div>
        )}
        {replies.map((r) => (
          <CommentNode
            key={r.id}
            comment={r}
            currentUserId={currentUserId}
            onDelete={onDelete}
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
  onDelete,
  onOpenProfile,
}: {
  post: Post;
  currentUserId: string;
  onDelete?: (id: string) => void;
  onOpenProfile?: (username: string) => void;
}) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);
  const [popping, setPopping] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const authorName = post.author_username ?? post.author_id.slice(0, 8);
  const isMine = post.author_id === currentUserId;

  const handleLike = async () => {
    setLiked(true);
    setPopping(true);
    setTimeout(() => setPopping(false), 350);
    const res = await likePost(post.id);
    setLikes(res.likes);
  };

  const loadComments = async () => {
    if (!showComments && comments.length === 0) {
      const data = await getComments(post.id);
      setComments(data);
    }
    setShowComments(!showComments);
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    const res = await createComment(post.id, text);
    setComments((prev) => [
      ...prev,
      {
        id: res.id,
        post_id: post.id,
        author_id: currentUserId,
        author_username: undefined,
        content: text,
        parent_id: null,
        created_at: res.created_at,
        replies: [],
      },
    ]);
    setCommentText("");
    if (!showComments) setShowComments(true);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
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

      {post.image_base64 && (
        <div style={{ background: "#000", display: "flex", justifyContent: "center" }}>
          <img
            src={post.image_base64}
            alt="post"
            style={{ width: "100%", maxHeight: 600, objectFit: "contain" }}
          />
        </div>
      )}

      <div style={{ padding: "10px 14px 6px" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 24, marginBottom: 6 }}>
          <button
            onClick={handleLike}
            className={popping ? "ig-heart-pop" : ""}
            style={{ color: liked ? "var(--ig-danger)" : "var(--ig-text)" }}
            title="좋아요"
          >
            {liked ? "❤" : "🤍"}
          </button>
          <button onClick={loadComments} title="댓글" style={{ fontSize: 22 }}>
            💬
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
                onDelete={handleDeleteComment}
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
          style={{
            color: commentText.trim() ? "var(--ig-accent)" : "rgba(0,149,246,0.4)",
            fontWeight: 600,
            fontSize: 14,
            cursor: commentText.trim() ? "pointer" : "default",
          }}
        >
          게시
        </button>
      </div>
    </article>
  );
}
