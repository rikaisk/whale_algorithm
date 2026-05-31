import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from algorithms.hash_table import HashTable
from algorithms.bst import BST
from algorithms.trie import Trie
from algorithms.graph import Graph
from algorithms.heap import MaxHeap

# 유저 저장: username -> User
user_store = HashTable()

# 포스트 저장: post_id -> Post
post_store = HashTable()

# 댓글 저장: comment_id -> Comment
comment_store = HashTable()

# DM 저장: message_id -> Message
message_store = HashTable()

# 피드 타임라인: (timestamp, post_id) 를 key로 BST에 삽입
feed_tree = BST()

# 검색 자동완성: username을 Trie에 삽입
search_trie = Trie()

# 태그 역인덱스: hashtag -> set of post_ids
tag_index: dict[str, set[str]] = {}

# 소셜 그래프: user_id 노드, 팔로우 관계 방향 엣지
social_graph = Graph()
