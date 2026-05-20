def build_failure(pattern: str) -> list[int]:
    m = len(pattern)
    failure = [0] * m
    j = 0
    for i in range(1, m):
        while j > 0 and pattern[i] != pattern[j]:
            j = failure[j - 1]
        if pattern[i] == pattern[j]:
            j += 1
        failure[i] = j
    return failure


def kmp_search(text: str, pattern: str) -> bool:
    if not pattern:
        return True
    if not text:
        return False
    n, m = len(text), len(pattern)
    failure = build_failure(pattern)
    j = 0
    for i in range(n):
        while j > 0 and text[i] != pattern[j]:
            j = failure[j - 1]
        if text[i] == pattern[j]:
            j += 1
        if j == m:
            return True
    return False
