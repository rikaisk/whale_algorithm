import { useState, useEffect } from "react";
import type { Post, Comment, UserMini } from "../api/client";
import {
  likePost,
  getComments,
  createComment,
  createReply,
  deleteComment,
  getPostLikers,
  likeComment,
} from "../api/client";
import Avatar from "./Avatar";

// 본문에서 검색어와 일치하는 부분을 볼드 처리
function highlightText(text: string, query?: string): React.ReactNode {
  const q = (query ?? "").trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <b key={idx} style={{ fontWeight: 800, background: "rgba(0,149,246,0.15)" }}>
        {text.slice(idx, idx + q.length)}
      </b>,
    );
    i = idx + q.length;
  }
  return parts;
}

// @멘션을 프로필 링크로, 검색어는 볼드로 렌더링
const MENTION_RE = /@([\p{L}\p{N}_]{2,20})/gu;

function renderContent(
  text: string,
  onOpenProfile?: (u: string) => void,
  query?: string,
): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<span key={key++}>{highlightText(text.slice(last, m.index), query)}</span>);
    }
    const uname = m[1];
    nodes.push(
      <span
        key={key++}
        onClick={
          onOpenProfile
            ? (e) => {
                e.stopPropagation();
                onOpenProfile(uname);
              }
            : undefined
        }
        style={{
          color: "var(--ig-accent)",
          fontWeight: 600,
          cursor: onOpenProfile ? "pointer" : "default",
        }}
      >
        @{uname}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(<span key={key++}>{highlightText(text.slice(last), query)}</span>);
  }
  return nodes;
}

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
  const [likes, setLikes] = useState(comment.likes ?? 0);
  const [liked, setLiked] = useState(Boolean(comment.liked_by_me));
  const authorName = comment.author_username ?? comment.author_id.slice(0, 8);
  const replies = comment.replies ?? [];

  const toggleLike = async () => {
    try {
      const res = await likeComment(comment.id);
      setLikes(res.likes);
      setLiked(res.liked_by_me);
    } catch {
      /* ignore */
    }
  };

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
          <span style={{ color: "var(--ig-text)" }}>{renderContent(comment.content, onOpenProfile)}</span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "var(--ig-text-muted)", alignItems: "center" }}>
          <span>{relativeTime(comment.created_at)}</span>
          <button
            onClick={toggleLike}
            style={{ fontWeight: 600, color: liked ? "var(--ig-danger)" : "var(--ig-text-muted)", fontSize: 12 }}
          >
            {liked ? "♥" : "♡"}{likes > 0 ? ` ${likes}` : ""}
          </button>
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
  highlight,
}: {
  post: Post;
  currentUserId: string;
  currentUsername?: string;
  currentAvatar?: string | null;
  onDelete?: (id: string) => void;
  onOpenProfile?: (username: string) => void;
  highlight?: string;
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
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<UserMini[]>([]);
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

  const openLikers = async () => {
    if (likes <= 0) return;
    try {
      setLikers(await getPostLikers(post.id));
    } catch {
      setLikers([]);
    }
    setShowLikers(true);
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
            style={{
              fontWeight: 600,
              fontSize: 14,
              cursor: onOpenProfile ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {authorName}
            {post.author_is_ai && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: "#fff",
                  background: "linear-gradient(135deg,#4f5bd5,#962fbf)",
                  borderRadius: 4,
                  padding: "1px 4px",
                  textTransform: "uppercase",
                }}
              >
                ai
              </span>
            )}
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
        <button
          onClick={openLikers}
          disabled={likes <= 0}
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 4,
            color: "var(--ig-text)",
            cursor: likes > 0 ? "pointer" : "default",
            padding: 0,
          }}
          title={likes > 0 ? "좋아요 누른 사람 보기" : undefined}
        >
          좋아요 {likes.toLocaleString()}개
        </button>
        <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
          <span
            onClick={onOpenProfile ? () => onOpenProfile(authorName) : undefined}
            style={{ fontWeight: 600, marginRight: 6, cursor: onOpenProfile ? "pointer" : "default" }}
          >
            {authorName}
          </span>
          {renderContent(post.content, onOpenProfile, highlight)}
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

      {showLikers && (
        <div
          onClick={() => setShowLikers(false)}
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
              좋아요
              <button
                onClick={() => setShowLikers(false)}
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
              {likers.length === 0 ? (
                <p style={{ textAlign: "center", padding: 30, color: "var(--ig-text-muted)" }}>
                  아직 좋아요가 없습니다.
                </p>
              ) : (
                likers.map((u) => (
                  <button
                    key={u.username}
                    onClick={() => {
                      setShowLikers(false);
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
    </article>
  );
}
