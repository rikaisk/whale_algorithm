class TrieNode:
    def __init__(self):
        self.children: dict[str, 'TrieNode'] = {}
        self.is_end: bool = False
        self.data = None


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str, data=None) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True
        node.data = data if data is not None else word

    def search(self, prefix: str) -> list:
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return []
            node = node.children[ch]
        results = []
        self._collect(node, results)
        return results

    def _collect(self, node, results):
        if node.is_end:
            results.append(node.data)
        for ch in node.children:
            self._collect(node.children[ch], results)

    def delete(self, word: str) -> None:
        self._delete(self.root, word, 0)

    def _delete(self, node, word, depth):
        if node is None:
            return False
        if depth == len(word):
            if not node.is_end:
                return False
            node.is_end = False
            node.data = None
            return len(node.children) == 0
        ch = word[depth]
        if ch not in node.children:
            return False
        should_delete = self._delete(node.children[ch], word, depth + 1)
        if should_delete:
            del node.children[ch]
            return not node.is_end and len(node.children) == 0
        return False
