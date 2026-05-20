class BSTNode:
    def __init__(self, key: tuple):
        self.key = key  # (timestamp, post_id)
        self.left = None
        self.right = None


class BST:
    def __init__(self):
        self.root = None

    def insert(self, key: tuple) -> None:
        self.root = self._insert(self.root, key)

    def _insert(self, node, key):
        if node is None:
            return BSTNode(key)
        if key < node.key:
            node.left = self._insert(node.left, key)
        elif key > node.key:
            node.right = self._insert(node.right, key)
        return node

    def delete(self, key: tuple) -> None:
        self.root = self._delete(self.root, key)

    def _delete(self, node, key):
        if node is None:
            return None
        if key < node.key:
            node.left = self._delete(node.left, key)
        elif key > node.key:
            node.right = self._delete(node.right, key)
        else:
            if node.left is None:
                return node.right
            if node.right is None:
                return node.left
            # 오른쪽 서브트리에서 최솟값 찾기
            successor = node.right
            while successor.left:
                successor = successor.left
            node.key = successor.key
            node.right = self._delete(node.right, successor.key)
        return node

    def inorder(self) -> list[tuple]:
        result = []
        self._inorder(self.root, result)
        return result

    def _inorder(self, node, result):
        if node is None:
            return
        self._inorder(node.left, result)
        result.append(node.key)
        self._inorder(node.right, result)

    def range_query(self, t1: float, t2: float) -> list[tuple]:
        result = []
        self._range_query(self.root, t1, t2, result)
        return result

    def _range_query(self, node, t1, t2, result):
        if node is None:
            return
        timestamp = node.key[0]
        if timestamp > t1:
            self._range_query(node.left, t1, t2, result)
        if t1 <= timestamp <= t2:
            result.append(node.key)
        if timestamp < t2:
            self._range_query(node.right, t1, t2, result)
