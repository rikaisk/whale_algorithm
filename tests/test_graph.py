from algorithms.graph import Graph


class TestGraph:
    def test_add_node_and_neighbors(self):
        g = Graph()
        g.add_node("A")
        assert g.neighbors("A") == []

    def test_add_edge(self):
        g = Graph()
        g.add_edge("A", "B")
        assert "B" in g.neighbors("A")
        assert "A" not in g.neighbors("B")  # 방향 그래프

    def test_remove_edge(self):
        g = Graph()
        g.add_edge("A", "B")
        g.remove_edge("A", "B")
        assert "B" not in g.neighbors("A")

    def test_remove_edge_nonexistent(self):
        g = Graph()
        g.add_node("A")
        g.remove_edge("A", "B")  # should not raise

    def test_bfs_recommend(self):
        g = Graph()
        # A -> B, A -> C, B -> D, C -> D
        g.add_edge("A", "B")
        g.add_edge("A", "C")
        g.add_edge("B", "D")
        g.add_edge("C", "D")
        result = g.bfs_recommend("A", depth=2)
        # D is 2 hops from A, not directly followed
        assert "D" in result

    def test_bfs_excludes_already_following(self):
        g = Graph()
        g.add_edge("A", "B")
        g.add_edge("B", "C")
        result = g.bfs_recommend("A", depth=2)
        assert "B" not in result  # already following

    def test_bfs_excludes_self(self):
        g = Graph()
        g.add_edge("A", "B")
        g.add_edge("B", "A")
        result = g.bfs_recommend("A", depth=2)
        assert "A" not in result

    def test_bfs_empty_graph(self):
        g = Graph()
        assert g.bfs_recommend("X") == {}

    def test_dijkstra_path(self):
        g = Graph()
        g.add_edge("A", "B")
        g.add_edge("B", "C")
        g.add_edge("A", "C")
        path = g.dijkstra_path("A", "C")
        assert path[0] == "A"
        assert path[-1] == "C"

    def test_dijkstra_no_path(self):
        g = Graph()
        g.add_node("A")
        g.add_node("B")
        path = g.dijkstra_path("A", "B")
        assert path == []

    def test_dijkstra_with_interests(self):
        g = Graph()
        g.add_edge("A", "B")
        g.add_edge("B", "C")
        g.add_edge("A", "D")
        g.add_edge("D", "C")
        interests = {
            "A": ["music", "travel"],
            "B": ["music", "travel"],  # 공통 2개 -> 가중치 1/3
            "C": ["food"],
            "D": ["coding"],            # 공통 0개 -> 가중치 1/1
        }
        path = g.dijkstra_path("A", "C", interest_map=interests)
        # A->B->C 경로가 더 가중치가 낮음 (공통관심사 많을수록 가중치 낮음)
        assert path == ["A", "B", "C"]

    def test_dijkstra_nonexistent_node(self):
        g = Graph()
        assert g.dijkstra_path("X", "Y") == []

    def test_complex_graph(self):
        g = Graph()
        for i in range(5):
            g.add_node(str(i))
        g.add_edge("0", "1")
        g.add_edge("0", "2")
        g.add_edge("1", "3")
        g.add_edge("2", "3")
        g.add_edge("3", "4")
        result = g.bfs_recommend("0", depth=2)
        assert "3" in result
