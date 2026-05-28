import { useState } from "react";
import type { Post, Comment } from "../api/client";
import { likePost, getComments, createComment, createReply, deleteComment } from "../api/client";

function CommentNode({ comment, currentUserId, onDelete }: {
  comment: Comment;
  currentUserId: string;
  onDelete: (id: string) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [replies, setReplies] = useState(comment.replies);

  const submitReply = async () => {
    if (!replyText.trim()) return;
    const res = await createReply(comment.id, currentUserId, replyText);
    setReplies((prev) => [
      ...prev,
      { id: res.id, post_id: comment.post_id, author_id: currentUserId,
        content: replyText, parent_id: comment.id, created_at: res.created_at, replies: [] },
    ]);
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div style={{ marginLeft: comment.parent_id ? 20 : 0, borderLeft: "2px solid #eee", paddingLeft: 8, marginTop: 6 }}>
      <div style={{ fontSize: 13 }}>
        <b>{comment.author_id.slice(0, 8)}</b>: {comment.content}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button style={btnStyle} onClick={() => setShowReply(!showReply)}>답글</button>
        {comment.author_id === currentUserId && (
          <button style={btnStyle} onClick={() => onDelete(comment.id)}>삭제</button>
        )}
      </div>
      {showReply && (
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
            placeholder="답글 입력..." style={{ flex: 1, fontSize: 12, padding: "2px 6px" }} />
          <button style={btnStyle} onClick={submitReply}>등록</button>
        </div>
      )}
      {replies.map((r) => (
        <CommentNode key={r.id} comment={r} currentUserId={currentUserId} onDelete={onDelete} />
      ))}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: 11, padding: "1px 6px", cursor: "pointer", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4,
};

export default function PostCard({ post, currentUserId, onDelete }: {
  post: Post;
  currentUserId: string;
  onDelete?: (id: string) => void;
}) {
  const [likes, setLikes] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  const handleLike = async () => {
    const res = await likePost(post.id);
    setLikes(res.likes);
  };

  const loadComments = async () => {
    if (!showComments) {
      const data = await getComments(post.id);
      setComments(data);
    }
    setShowComments(!showComments);
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    const res = await createComment(post.id, currentUserId, commentText);
    setComments((prev) => [
      ...prev,
      { id: res.id, post_id: post.id, author_id: currentUserId,
        content: commentText, parent_id: null, created_at: res.created_at, replies: [] },
    ]);
    setCommentText("");
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const ts = new Date(post.created_at * 1000).toLocaleString("ko-KR");

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 12, background: "#fff" }}>
      <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>{ts}</div>
      <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{post.content}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {post.hashtags.map((t) => (
          <span key={t} style={{ background: "#e8f0fe", color: "#1a73e8", borderRadius: 12, padding: "2px 8px", fontSize: 12 }}>
            #{t}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button style={btnStyle} onClick={handleLike}>❤ {likes}</button>
        <button style={btnStyle} onClick={loadComments}>💬 댓글 {post.comment_count}</button>
        {onDelete && (
          <button style={{ ...btnStyle, color: "#c00" }} onClick={() => onDelete(post.id)}>삭제</button>
        )}
      </div>
      {showComments && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글 입력..." style={{ flex: 1, padding: "4px 8px" }} />
            <button style={btnStyle} onClick={submitComment}>등록</button>
          </div>
          {comments.map((c) => (
            <CommentNode key={c.id} comment={c} currentUserId={currentUserId} onDelete={handleDeleteComment} />
          ))}
        </div>
      )}
    </div>
  );
}
