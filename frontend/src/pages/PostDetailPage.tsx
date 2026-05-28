import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getPost, likePost, deletePost, getComments, createComment, createReply, deleteComment } from "../api";
import { useNavigate } from "react-router-dom";

interface Props {
  currentUser: string;
}

interface PostData {
  id: string;
  author_id: string;
  author_username: string;
  content: string;
  hashtags: string[];
  likes: number;
  created_at: number;
}

interface CommentNode {
  id: string;
  author_username: string;
  content: string;
  created_at: number;
  replies: CommentNode[];
}

export default function PostDetailPage({ currentUser }: Props) {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postId) loadPost();
  }, [postId]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const [postData, commentsData] = await Promise.all([
        getPost(postId!),
        getComments(postId!),
      ]);
      setPost(postData);
      setComments(commentsData);
    } catch {
      setPost(null);
    }
    setLoading(false);
  };

  const handleLike = async () => {
    await likePost(postId!);
    loadPost();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    await deletePost(postId!);
    navigate(-1);
  };

  const handleComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    await createComment(postId!, currentUser, newComment);
    setNewComment("");
    loadPost();
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim() || !currentUser) return;
    await createReply(commentId, currentUser, replyContent);
    setReplyTo(null);
    setReplyContent("");
    loadPost();
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    loadPost();
  };

  const renderComment = (comment: CommentNode, depth: number = 0) => (
    <div key={comment.id} className={depth > 0 ? "comment-tree" : ""}>
      <div className="comment-item">
        <span className="comment-author">{comment.author_username}</span>
        <span className="post-time" style={{ marginLeft: "0.5rem" }}>
          {new Date(comment.created_at * 1000).toLocaleString()}
        </span>
        <p className="comment-content">{comment.content}</p>
        <div className="comment-actions">
          {currentUser && (
            <button className="btn-sm" onClick={() => { setReplyTo(comment.id); setReplyContent(""); }}>
              Reply
            </button>
          )}
          <button className="btn-sm" onClick={() => handleDeleteComment(comment.id)}>
            Delete
          </button>
        </div>
        {replyTo === comment.id && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              onKeyDown={(e) => e.key === "Enter" && handleReply(comment.id)}
            />
            <button className="btn" onClick={() => handleReply(comment.id)}>Send</button>
            <button className="btn-sm" onClick={() => setReplyTo(null)}>Cancel</button>
          </div>
        )}
      </div>
      {comment.replies.map((reply) => renderComment(reply, depth + 1))}
    </div>
  );

  if (loading) return <div className="loading">Loading...</div>;
  if (!post) return <div className="empty">Post not found</div>;

  return (
    <div>
      <div className="card">
        <div className="post-header">
          <Link to={`/profile/${post.author_username}`} className="post-author">
            {post.author_username}
          </Link>
          <span className="post-time">
            {new Date(post.created_at * 1000).toLocaleString()}
          </span>
        </div>
        <p className="post-content" style={{ fontSize: "1.1rem" }}>{post.content}</p>
        <div className="post-tags">
          {post.hashtags.map((tag) => (
            <span key={tag} className="tag">#{tag}</span>
          ))}
        </div>
        <div className="post-footer" style={{ marginTop: "1rem" }}>
          <button className="btn-like" onClick={handleLike}>Like ({post.likes})</button>
          {currentUser === post.author_username && (
            <button className="btn-danger" onClick={handleDelete}>Delete</button>
          )}
        </div>
      </div>

      <h3 style={{ margin: "1.5rem 0 1rem", fontWeight: 600 }}>Comments</h3>

      {currentUser && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
          />
          <button className="btn" onClick={handleComment}>Send</button>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="empty">No comments yet</div>
      ) : (
        comments.map((c) => renderComment(c))
      )}
    </div>
  );
}
