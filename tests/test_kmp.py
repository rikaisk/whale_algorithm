from algorithms.kmp import build_failure, kmp_search


class TestKMP:
    def test_build_failure_simple(self):
        assert build_failure("ABAB") == [0, 0, 1, 2]

    def test_build_failure_no_prefix(self):
        assert build_failure("ABCD") == [0, 0, 0, 0]

    def test_build_failure_all_same(self):
        assert build_failure("AAAA") == [0, 1, 2, 3]

    def test_search_found(self):
        assert kmp_search("hello world", "world") is True

    def test_search_not_found(self):
        assert kmp_search("hello world", "xyz") is False

    def test_search_at_start(self):
        assert kmp_search("hello world", "hello") is True

    def test_search_full_match(self):
        assert kmp_search("abc", "abc") is True

    def test_search_empty_pattern(self):
        assert kmp_search("hello", "") is True

    def test_search_empty_text(self):
        assert kmp_search("", "abc") is False

    def test_search_pattern_longer(self):
        assert kmp_search("ab", "abcdef") is False

    def test_search_korean(self):
        assert kmp_search("오늘 맛집 탐방 후기입니다", "맛집") is True

    def test_search_repeated_pattern(self):
        assert kmp_search("ABABABABAB", "ABAB") is True

    def test_search_multiple_occurrences(self):
        assert kmp_search("abcabcabc", "abc") is True
