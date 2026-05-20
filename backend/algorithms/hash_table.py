class HashTable:
    def __init__(self, size=1024):
        self.size = size
        self.buckets = [[] for _ in range(size)]
        self.count = 0

    def _hash(self, key: str) -> int:
        # djb2 알고리즘
        h = 5381
        for ch in key:
            h = ((h << 5) + h) + ord(ch)
        return h % self.size

    def set(self, key: str, value) -> None:
        idx = self._hash(key)
        bucket = self.buckets[idx]
        for i, (k, v) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        self.count += 1

    def get(self, key: str):
        idx = self._hash(key)
        for k, v in self.buckets[idx]:
            if k == key:
                return v
        raise KeyError(key)

    def delete(self, key: str) -> None:
        idx = self._hash(key)
        bucket = self.buckets[idx]
        for i, (k, v) in enumerate(bucket):
            if k == key:
                bucket.pop(i)
                self.count -= 1
                return
        raise KeyError(key)

    def exists(self, key: str) -> bool:
        idx = self._hash(key)
        for k, v in self.buckets[idx]:
            if k == key:
                return True
        return False

    def values(self) -> list:
        result = []
        for bucket in self.buckets:
            for k, v in bucket:
                result.append(v)
        return result
