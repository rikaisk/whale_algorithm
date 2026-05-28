import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getFriends, recommendPeople, findPath, followUser, unfollowUser } from "../api";

interface Props {
  currentUser: string;
}

interface FriendInfo {
  user_id: string;
  username: string;
  bio: string;
}

interface RecPerson {
  user_id: string;
  username: string;
  bio: string;
  common_friends: number;
}

export default function FriendsPage({ currentUser }: Props) {
  const { username } = useParams<{ username: string }>();
  const [tab, setTab] = useState<"following" | "followers" | "discover" | "path">("following");
  const [following, setFollowing] = useState<FriendInfo[]>([]);
  const [followers, setFollowers] = useState<FriendInfo[]>([]);
  const [recPeople, setRecPeople] = useState<RecPerson[]>([]);
  const [pathTarget, setPathTarget] = useState("");
  const [pathResult, setPathResult] = useState<string[]>([]);
  const [pathSearched, setPathSearched] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) loadFriends();
  }, [username]);

  useEffect(() => {
    if (username && tab === "discover") loadRecommend();
  }, [username, tab]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await getFriends(username!);
      setFollowing(data.following);
      setFollowers(data.followers);
    } catch {}
    setLoading(false);
  };

  const loadRecommend = async () => {
    setLoading(true);
    try {
      const data = await recommendPeople(username!);
      setRecPeople(data);
    } catch {}
    setLoading(false);
  };

  const handleFollow = async (target: string) => {
    try {
      await followUser(currentUser, target);
      loadFriends();
      if (tab === "discover") loadRecommend();
    } catch {}
  };

  const handleUnfollow = async (target: string) => {
    try {
      await unfollowUser(currentUser, target);
      loadFriends();
    } catch {}
  };

  const handleFindPath = async () => {
    if (!pathTarget.trim()) return;
    setLoading(true);
    setPathSearched(true);
    try {
      const data = await findPath(username!, pathTarget);
      setPathResult(data.path);
    } catch {
      setPathResult([]);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="page-title">Friends</h1>

      <div className="tabs">
        <button className={`tab ${tab === "following" ? "active" : ""}`} onClick={() => setTab("following")}>
          Following ({following.length})
        </button>
        <button className={`tab ${tab === "followers" ? "active" : ""}`} onClick={() => setTab("followers")}>
          Followers ({followers.length})
        </button>
        <button className={`tab ${tab === "discover" ? "active" : ""}`} onClick={() => setTab("discover")}>
          Discover
        </button>
        <button className={`tab ${tab === "path" ? "active" : ""}`} onClick={() => setTab("path")}>
          Connection
        </button>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {!loading && tab === "following" && (
        <div>
          {following.length === 0 ? (
            <div className="empty">Not following anyone yet</div>
          ) : (
            following.map((f) => (
              <div className="card" key={f.user_id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <Link to={`/profile/${f.username}`} className="post-author">{f.username}</Link>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0.25rem 0" }}>{f.bio}</p>
                  </div>
                  {currentUser === username && (
                    <button className="btn-sm" onClick={() => handleUnfollow(f.username)}>Unfollow</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === "followers" && (
        <div>
          {followers.length === 0 ? (
            <div className="empty">No followers yet</div>
          ) : (
            followers.map((f) => (
              <div className="card" key={f.user_id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <Link to={`/profile/${f.username}`} className="post-author">{f.username}</Link>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0.25rem 0" }}>{f.bio}</p>
                  </div>
                  {currentUser === username && !following.some((fw) => fw.user_id === f.user_id) && (
                    <button className="btn" onClick={() => handleFollow(f.username)}>Follow back</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === "discover" && (
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
            People you may know (based on mutual connections)
          </p>
          {recPeople.length === 0 ? (
            <div className="empty">No recommendations yet. Follow more people!</div>
          ) : (
            recPeople.map((person) => (
              <div className="card" key={person.user_id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <Link to={`/profile/${person.username}`} className="post-author">{person.username}</Link>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0.25rem 0" }}>{person.bio}</p>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Mutual connections: {person.common_friends}
                    </span>
                  </div>
                  <button className="btn" onClick={() => handleFollow(person.username)}>Follow</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === "path" && (
        <div>
          <div className="card">
            <div className="form-group">
              <label>Find how you're connected to someone</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={pathTarget}
                  onChange={(e) => setPathTarget(e.target.value)}
                  placeholder="Enter username"
                  onKeyDown={(e) => e.key === "Enter" && handleFindPath()}
                />
                <button className="btn" onClick={handleFindPath}>Find</button>
              </div>
            </div>
          </div>

          {pathResult.length > 0 && (
            <div className="card">
              <strong>Connected through {pathResult.length - 1} people:</strong>
              <div className="path-display">
                {pathResult.map((name, i) => (
                  <span key={i}>
                    <Link to={`/profile/${name}`} className="path-node">{name}</Link>
                    {i < pathResult.length - 1 && <span className="path-arrow"> → </span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pathResult.length === 0 && pathSearched && (
            <div className="empty">No connection found between you and {pathTarget}</div>
          )}
        </div>
      )}
    </div>
  );
}
