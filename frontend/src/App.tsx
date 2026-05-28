import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import FeedPage from "./pages/FeedPage";
import SearchPage from "./pages/SearchPage";
import PostDetailPage from "./pages/PostDetailPage";
import FriendsPage from "./pages/FriendsPage";

function App() {
  const [currentUser, setCurrentUser] = useState<string>(
    localStorage.getItem("algosns_user") || ""
  );
  const navigate = useNavigate();

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem("algosns_user", username);
    navigate(`/feed/${username}`);
  };

  const handleLogout = () => {
    setCurrentUser("");
    localStorage.removeItem("algosns_user");
    navigate("/");
  };

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="logo">AlgoSNS</Link>
        <div className="nav-links">
          {currentUser ? (
            <>
              <Link to={`/feed/${currentUser}`}>Feed</Link>
              <Link to="/search">Search</Link>
              <Link to={`/friends/${currentUser}`}>Friends</Link>
              <Link to={`/profile/${currentUser}`}>{currentUser}</Link>
              <button onClick={handleLogout} className="btn-sm">Logout</button>
            </>
          ) : (
            <Link to="/">Login</Link>
          )}
        </div>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage onLogin={handleLogin} />} />
          <Route path="/profile/:username" element={<ProfilePage currentUser={currentUser} />} />
          <Route path="/feed/:username" element={<FeedPage currentUser={currentUser} />} />
          <Route path="/search" element={<SearchPage currentUser={currentUser} />} />
          <Route path="/post/:postId" element={<PostDetailPage currentUser={currentUser} />} />
          <Route path="/friends/:username" element={<FriendsPage currentUser={currentUser} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
