import pytest
from algorithms.heap import MaxHeap


class TestMaxHeap:
    def test_push_and_pop(self):
        heap = MaxHeap()
        heap.push(3.0, "c")
        heap.push(1.0, "a")
        heap.push(5.0, "e")
        assert heap.pop() == (5.0, "e")
        assert heap.pop() == (3.0, "c")
        assert heap.pop() == (1.0, "a")

    def test_pop_empty_raises(self):
        heap = MaxHeap()
        with pytest.raises(IndexError):
            heap.pop()

    def test_single_element(self):
        heap = MaxHeap()
        heap.push(1.0, "a")
        assert heap.pop() == (1.0, "a")

    def test_top_k(self):
        heap = MaxHeap()
        items = [(3.0, "c"), (1.0, "a"), (5.0, "e"), (4.0, "d"), (2.0, "b")]
        result = heap.top_k(items, 3)
        assert result == [(5.0, "e"), (4.0, "d"), (3.0, "c")]

    def test_top_k_larger_than_items(self):
        heap = MaxHeap()
        items = [(1.0, "a"), (2.0, "b")]
        result = heap.top_k(items, 5)
        assert len(result) == 2

    def test_top_k_zero(self):
        heap = MaxHeap()
        items = [(1.0, "a"), (2.0, "b")]
        result = heap.top_k(items, 0)
        assert result == []

    def test_heap_order_maintained(self):
        heap = MaxHeap()
        for i in range(20):
            heap.push(float(i), f"p{i}")
        prev_score = float('inf')
        while heap.heap:
            score, _ = heap.pop()
            assert score <= prev_score
            prev_score = score

    def test_duplicate_scores(self):
        heap = MaxHeap()
        heap.push(5.0, "a")
        heap.push(5.0, "b")
        heap.push(5.0, "c")
        results = [heap.pop() for _ in range(3)]
        assert all(s == 5.0 for s, _ in results)
