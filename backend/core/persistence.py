import json
import os
import sys
from dataclasses import asdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.models import User, Post, Comment, Message
from core.store import (
    user_store, post_store, comment_store, message_store,
    feed_tree, search_trie, tag_index, social_graph,
)
from core import auth

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data.json")


def save_all() -> None:
    users = [asdict(u) for u in user_store.values()]
    posts = [asdict(p) for p in post_store.values()]
    comments = [asdict(c) for c in comment_store.values()]
    messages = [asdict(m) for m in message_store.values()]

    payload = {
        "users": users,
        "posts": posts,
        "comments": comments,
        "messages": messages,
        "tag_index": {tag: list(post_ids) for tag, post_ids in tag_index.items()},
        "graph": {node: list(neighbors) for node, neighbors in social_graph.adj.items()},
        "tokens": dict(auth.token_store),
    }

    tmp_path = DATA_FILE + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, DATA_FILE)


def load_all() -> None:
    if not os.path.exists(DATA_FILE):
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        payload = json.load(f)

    for u in payload.get("users", []):
        user = User(**u)
        user_store.set(user.username, user)
        search_trie.insert(user.username, user.username)
        social_graph.add_node(user.id)

    for p in payload.get("posts", []):
        post = Post(**p)
        post_store.set(post.id, post)
        feed_tree.insert((post.created_at, post.id))

    for c in payload.get("comments", []):
        comment = Comment(**c)
        comment_store.set(comment.id, comment)

    for m in payload.get("messages", []):
        message = Message(**m)
        message_store.set(message.id, message)

    for tag, post_ids in payload.get("tag_index", {}).items():
        tag_index[tag] = set(post_ids)

    for node, neighbors in payload.get("graph", {}).items():
        social_graph.add_node(node)
        for neighbor in neighbors:
            social_graph.add_edge(node, neighbor)

    auth.token_store.update(payload.get("tokens", {}))
