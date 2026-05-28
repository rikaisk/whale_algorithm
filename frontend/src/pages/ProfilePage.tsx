import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getUser, updateBio, followUser, unfollowUser, getPost } from "../api";

interface Props {
  currentUser: string;
}

interface UserData {
  id: string;
  username: string;
  bio: string;
  interests: string[];
  following: string[];
  followers: string[];
  post_ids: string[];
}

interface PostData {
  id: string;
  content: string;
  hashtags: string[];
  likes: number;
  created_at: number;
}

export default function ProfilePage({ currentUser }: Props) {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [editing, setEditing] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getUser(username!);
      setUser(data);
      setNewBio(data.bio);

      // Check follow status
      if (currentUser && currentUser !== username) {
        const me = await getUser(currentUser);
        setIsFollowing(me.following.includes(data.id));
      }

      // Load posts
      const postPromises = data.post_ids.slice(-10).map((pid: string) =>
        getPost(pid).catch(() => null)
      );
      const postResults = await Promise.all(postPromises);
      setPosts(postResults.filter(Boolean).reverse());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBioUpdate = async () => {
    try {
      await updateBio(username!, newBio);
      setEditing(false);
      loadProfile();
    } catch {}
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await unfollowUser(currentUser, username!);
      } else {
        await followUser(currentUser, username!);
      }
      setIsFollowing(!isFollowing);
      loadProfile();
    } catch {}
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <div className="empty">User not found</div>;

  return (
    <div>
      <div className="card">
        <h2>{user.username}</h2>

        {editing ? (
          <div style={{ marginTop: "1rem" }}>
            <textarea value={newBio} onChange={(e) => setNewBio(e.target.value)} />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button className="btn" onClick={handleBioUpdate}>Save</button>
              <button className="btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <p style={{ margin: "0.5rem 0", color: "var(--text-secondary)" }}>{user.bio}</p>
        )}

        <div className="post-tags">
          {user.interests.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        <div className="profile-stats">
          <div className="stat">
            <div className="stat-value">{user.post_ids.length}</div>
            <div className="stat-label">Posts</div>
          </div>
          <div className="stat">
            <div className="stat-value">{user.followers.length}</div>
            <div className="stat-label">Followers</div>
          </div>
          <div className="stat">
            <div className="stat-value">{user.following.length}</div>
            <div className="stat-label">Following</div>
          </div>
        </div>

        {currentUser === username ? (
          !editing && <button className="btn-sm" onClick={() => setEditing(true)}>Edit Bio</button>
        ) : currentUser ? (
          <button className={isFollowing ? "btn-sm" : "btn"} onClick={handleFollow}>
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
        ) : null}
      </div>

      <h3 className="page-title" style={{ fontSize: "1.2rem", marginTop: "1.5rem" }}>Posts</h3>
      {posts.length === 0 ? (
        <div className="empty">No posts yet</div>
      ) : (
        posts.map((post) => (
          <Link to={`/post/${post.id}`} key={post.id} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="post-card">
              <p className="post-content">{post.content}</p>
              <div className="post-tags">
                {post.hashtags.map((tag) => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
              </div>
              <div className="post-footer" style={{ marginTop: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Likes: {post.likes}
                </span>
                <span className="post-time">
                  {new Date(post.created_at * 1000).toLocaleString()}
                </span>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
