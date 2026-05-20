class MaxHeap:
    def __init__(self):
        self.heap = []  # list of (score, post_id)

    def _parent(self, i):
        return (i - 1) // 2

    def _left(self, i):
        return 2 * i + 1

    def _right(self, i):
        return 2 * i + 2

    def _swap(self, i, j):
        self.heap[i], self.heap[j] = self.heap[j], self.heap[i]

    def _sift_up(self, i):
        while i > 0 and self.heap[i][0] > self.heap[self._parent(i)][0]:
            self._swap(i, self._parent(i))
            i = self._parent(i)

    def _sift_down(self, i):
        size = len(self.heap)
        while True:
            largest = i
            left = self._left(i)
            right = self._right(i)
            if left < size and self.heap[left][0] > self.heap[largest][0]:
                largest = left
            if right < size and self.heap[right][0] > self.heap[largest][0]:
                largest = right
            if largest == i:
                break
            self._swap(i, largest)
            i = largest

    def push(self, score: float, post_id: str) -> None:
        self.heap.append((score, post_id))
        self._sift_up(len(self.heap) - 1)

    def pop(self) -> tuple[float, str]:
        if not self.heap:
            raise IndexError("pop from empty heap")
        self._swap(0, len(self.heap) - 1)
        item = self.heap.pop()
        if self.heap:
            self._sift_down(0)
        return item

    def top_k(self, items: list[tuple], k: int) -> list[tuple]:
        temp_heap = MaxHeap()
        for score, post_id in items:
            temp_heap.push(score, post_id)
        result = []
        for _ in range(min(k, len(temp_heap.heap))):
            result.append(temp_heap.pop())
        return result
