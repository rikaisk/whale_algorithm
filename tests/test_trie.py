from algorithms.trie import Trie


class TestTrie:
    def test_insert_and_search(self):
        trie = Trie()
        trie.insert("alice")
        trie.insert("bob")
        trie.insert("alex")
        result = trie.search("al")
        assert sorted(result) == ["alex", "alice"]

    def test_search_exact(self):
        trie = Trie()
        trie.insert("hello")
        assert trie.search("hello") == ["hello"]

    def test_search_no_match(self):
        trie = Trie()
        trie.insert("alice")
        assert trie.search("bob") == []

    def test_search_empty_prefix(self):
        trie = Trie()
        trie.insert("a")
        trie.insert("b")
        result = trie.search("")
        assert sorted(result) == ["a", "b"]

    def test_insert_with_data(self):
        trie = Trie()
        trie.insert("alice", data={"id": "123", "name": "Alice"})
        result = trie.search("alice")
        assert result == [{"id": "123", "name": "Alice"}]

    def test_delete(self):
        trie = Trie()
        trie.insert("alice")
        trie.insert("alex")
        trie.delete("alice")
        result = trie.search("al")
        assert result == ["alex"]

    def test_delete_nonexistent(self):
        trie = Trie()
        trie.insert("alice")
        trie.delete("bob")  # should not raise
        assert trie.search("alice") == ["alice"]

    def test_delete_preserves_shared_prefix(self):
        trie = Trie()
        trie.insert("abc")
        trie.insert("abcd")
        trie.delete("abcd")
        assert trie.search("abc") == ["abc"]

    def test_many_words(self):
        trie = Trie()
        words = [f"user_{i}" for i in range(50)]
        for w in words:
            trie.insert(w)
        result = trie.search("user_")
        assert len(result) == 50
