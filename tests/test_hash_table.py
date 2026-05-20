import pytest
from algorithms.hash_table import HashTable


class TestHashTable:
    def test_set_and_get(self):
        ht = HashTable()
        ht.set("alice", {"name": "Alice"})
        assert ht.get("alice") == {"name": "Alice"}

    def test_overwrite(self):
        ht = HashTable()
        ht.set("key", "v1")
        ht.set("key", "v2")
        assert ht.get("key") == "v2"
        assert ht.count == 1

    def test_get_missing_raises(self):
        ht = HashTable()
        with pytest.raises(KeyError):
            ht.get("missing")

    def test_delete(self):
        ht = HashTable()
        ht.set("a", 1)
        ht.delete("a")
        assert not ht.exists("a")
        assert ht.count == 0

    def test_delete_missing_raises(self):
        ht = HashTable()
        with pytest.raises(KeyError):
            ht.delete("missing")

    def test_exists(self):
        ht = HashTable()
        assert not ht.exists("x")
        ht.set("x", 10)
        assert ht.exists("x")

    def test_values(self):
        ht = HashTable()
        ht.set("a", 1)
        ht.set("b", 2)
        ht.set("c", 3)
        vals = ht.values()
        assert sorted(vals) == [1, 2, 3]

    def test_collision_handling(self):
        # 작은 사이즈로 충돌 유도
        ht = HashTable(size=2)
        ht.set("a", 1)
        ht.set("b", 2)
        ht.set("c", 3)
        assert ht.get("a") == 1
        assert ht.get("b") == 2
        assert ht.get("c") == 3

    def test_many_items(self):
        ht = HashTable()
        for i in range(100):
            ht.set(f"key_{i}", i)
        for i in range(100):
            assert ht.get(f"key_{i}") == i
        assert ht.count == 100
