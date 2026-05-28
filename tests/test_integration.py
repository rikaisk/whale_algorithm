"""
Integration tests for AlgoSNS API endpoints.
Run: cd algosns && python -m pytest tests/test_integration.py -v
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import pytest
from fastapi.testclient import TestClient

# Reset stores before importing app
from core import store
from algorithms.hash_table import HashTable
from algorithms.bst import BST
from algorithms.trie import Trie
from algorithms.graph import Graph


@pytest.fixture(autouse=True)
def reset_stores():
    """Reset all stores before each test by replacing module-level objects."""
    new_user = HashTable()
    new_post = HashTable()
    new_comment = HashTable()
    new_feed = BST()
    new_trie = Trie()
    new_graph = Graph()
    new_tag_index = {}

    # Patch store module
    store.user_store = new_user
    store.post_store = new_post
    store.comment_store = new_comment
    store.feed_tree = new_feed
    store.search_trie = new_trie
    store.tag_index = new_tag_index
    store.social_graph = new_graph

    # Patch all router modules that imported from store
    from routers import users, posts, search, recommend, comments
    for mod in [users, posts, search, recommend, comments]:
        for attr, val in [
            ("user_store", new_user), ("post_store", new_post),
            ("comment_store", new_comment), ("feed_tree", new_feed),
            ("search_trie", new_trie), ("tag_index", new_tag_index),
            ("social_graph", new_graph),
        ]:
            if hasattr(mod, attr):
                setattr(mod, attr, val)

    yield


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


def register_user(client, username, bio="test bio"):
    return client.post("/users/register", json={"username": username, "bio": bio})


# --- User Tests ---

class TestUsers:
    def test_register(self, client):
        res = register_user(client, "testuser", "I love coding and music")
        assert res.status_code == 200
        data = res.json()
        assert data["username"] == "testuser"
        assert "user_id" in data

    def test_register_duplicate(self, client):
        register_user(client, "testuser")
        res = register_user(client, "testuser")
        assert res.status_code == 400

    def test_get_user(self, client):
        register_user(client, "alice", "travel lover")
        res = client.get("/users/alice")
        assert res.status_code == 200
        assert res.json()["username"] == "alice"

    def test_get_user_not_found(self, client):
        res = client.get("/users/nonexistent")
        assert res.status_code == 404

    def test_update_bio(self, client):
        register_user(client, "alice", "old bio")
        res = client.patch("/users/alice/bio", json={"bio": "new bio about travel"})
        assert res.status_code == 200
        assert res.json()["bio"] == "new bio about travel"

    def test_follow_unfollow(self, client):
        register_user(client, "alice")
        register_user(client, "bob")

        # Follow
        res = client.post("/users/alice/follow/bob")
        assert res.status_code == 200

        # Check following
        alice = client.get("/users/alice").json()
        assert len(alice["following"]) == 1

        # Unfollow
        res = client.delete("/users/alice/follow/bob")
        assert res.status_code == 200

        alice = client.get("/users/alice").json()
        assert len(alice["following"]) == 0

    def test_follow_self(self, client):
        register_user(client, "alice")
        res = client.post("/users/alice/follow/alice")
        assert res.status_code == 400

    def test_follow_already_following(self, client):
        register_user(client, "alice")
        register_user(client, "bob")
        client.post("/users/alice/follow/bob")
        res = client.post("/users/alice/follow/bob")
        assert res.status_code == 400


# --- Post Tests ---

class TestPosts:
    def test_create_post(self, client):
        register_user(client, "alice")
        res = client.post("/posts", json={"author_username": "alice", "content": "Hello world!"})
        assert res.status_code == 200
        assert "post_id" in res.json()

    def test_get_post(self, client):
        register_user(client, "alice")
        create_res = client.post("/posts", json={"author_username": "alice", "content": "Test post"})
        post_id = create_res.json()["post_id"]

        res = client.get(f"/posts/{post_id}")
        assert res.status_code == 200
        assert res.json()["content"] == "Test post"

    def test_delete_post(self, client):
        register_user(client, "alice")
        create_res = client.post("/posts", json={"author_username": "alice", "content": "To delete"})
        post_id = create_res.json()["post_id"]

        res = client.delete(f"/posts/{post_id}")
        assert res.status_code == 200

        res = client.get(f"/posts/{post_id}")
        assert res.status_code == 404

    def test_like_post(self, client):
        register_user(client, "alice")
        create_res = client.post("/posts", json={"author_username": "alice", "content": "Like me!"})
        post_id = create_res.json()["post_id"]

        res = client.post(f"/posts/{post_id}/like")
        assert res.status_code == 200
        assert res.json()["likes"] == 1

        res = client.post(f"/posts/{post_id}/like")
        assert res.json()["likes"] == 2

    def test_feed(self, client):
        register_user(client, "alice")
        register_user(client, "bob")
        client.post("/users/alice/follow/bob")

        client.post("/posts", json={"author_username": "bob", "content": "Bob's post"})

        res = client.get("/feed/alice")
        assert res.status_code == 200
        feed = res.json()
        assert len(feed) == 1
        assert feed[0]["content"] == "Bob's post"

    def test_feed_empty(self, client):
        register_user(client, "alice")
        res = client.get("/feed/alice")
        assert res.status_code == 200
        assert res.json() == []


# --- Search Tests ---

class TestSearch:
    def test_search_users(self, client):
        register_user(client, "alice")
        register_user(client, "alex")
        register_user(client, "bob")

        res = client.get("/search/users?q=al")
        assert res.status_code == 200
        results = res.json()
        assert "alice" in results
        assert "alex" in results
        assert "bob" not in results

    def test_search_posts(self, client):
        register_user(client, "alice")
        client.post("/posts", json={"author_username": "alice", "content": "I love Python programming"})
        client.post("/posts", json={"author_username": "alice", "content": "Java is also good"})

        res = client.get("/search/posts?q=Python")
        assert res.status_code == 200
        results = res.json()
        assert len(results) >= 1
        assert any("Python" in r["content"] for r in results)

    def test_search_empty_query(self, client):
        res = client.get("/search/users?q=")
        assert res.status_code == 200
        assert res.json() == []


# --- Comment Tests ---

class TestComments:
    def test_create_comment(self, client):
        register_user(client, "alice")
        register_user(client, "bob")
        post_res = client.post("/posts", json={"author_username": "alice", "content": "Hello"})
        post_id = post_res.json()["post_id"]

        res = client.post(f"/posts/{post_id}/comments", json={"author_username": "bob", "content": "Nice post!"})
        assert res.status_code == 200
        assert "comment_id" in res.json()

    def test_create_reply(self, client):
        register_user(client, "alice")
        register_user(client, "bob")
        post_res = client.post("/posts", json={"author_username": "alice", "content": "Hello"})
        post_id = post_res.json()["post_id"]

        comment_res = client.post(f"/posts/{post_id}/comments", json={"author_username": "bob", "content": "Nice!"})
        comment_id = comment_res.json()["comment_id"]

        reply_res = client.post(f"/comments/{comment_id}/replies", json={"author_username": "alice", "content": "Thanks!"})
        assert reply_res.status_code == 200

    def test_get_comment_tree(self, client):
        register_user(client, "alice")
        register_user(client, "bob")
        post_res = client.post("/posts", json={"author_username": "alice", "content": "Hello"})
        post_id = post_res.json()["post_id"]

        comment_res = client.post(f"/posts/{post_id}/comments", json={"author_username": "bob", "content": "Root comment"})
        comment_id = comment_res.json()["comment_id"]

        client.post(f"/comments/{comment_id}/replies", json={"author_username": "alice", "content": "Reply 1"})

        res = client.get(f"/posts/{post_id}/comments")
        assert res.status_code == 200
        tree = res.json()
        assert len(tree) == 1
        assert tree[0]["content"] == "Root comment"
        assert len(tree[0]["replies"]) == 1
        assert tree[0]["replies"][0]["content"] == "Reply 1"

    def test_delete_comment(self, client):
        register_user(client, "alice")
        post_res = client.post("/posts", json={"author_username": "alice", "content": "Hello"})
        post_id = post_res.json()["post_id"]

        comment_res = client.post(f"/posts/{post_id}/comments", json={"author_username": "alice", "content": "To delete"})
        comment_id = comment_res.json()["comment_id"]

        res = client.delete(f"/comments/{comment_id}")
        assert res.status_code == 200

        comments = client.get(f"/posts/{post_id}/comments").json()
        assert len(comments) == 0


# --- Recommend Tests ---

class TestRecommend:
    def test_recommend_people(self, client):
        register_user(client, "alice")
        register_user(client, "bob")
        register_user(client, "charlie")

        client.post("/users/alice/follow/bob")
        client.post("/users/bob/follow/charlie")

        res = client.get("/recommend/people/alice")
        assert res.status_code == 200
        # charlie should be recommended (friend of friend)

    def test_find_path(self, client):
        register_user(client, "alice")
        register_user(client, "bob")
        register_user(client, "charlie")

        client.post("/users/alice/follow/bob")
        client.post("/users/bob/follow/charlie")

        res = client.get("/recommend/path/alice/charlie")
        assert res.status_code == 200
        path = res.json()["path"]
        assert path[0] == "alice"
        assert path[-1] == "charlie"

    def test_find_path_no_connection(self, client):
        register_user(client, "alice")
        register_user(client, "bob")

        res = client.get("/recommend/path/alice/bob")
        assert res.status_code == 200
        assert res.json()["path"] == []

    def test_recommend_posts(self, client):
        register_user(client, "alice", "I love travel and food")
        register_user(client, "bob", "coding enthusiast")

        client.post("/posts", json={"author_username": "bob", "content": "Amazing travel tips for Korea"})

        res = client.get("/recommend/posts/alice")
        assert res.status_code == 200
