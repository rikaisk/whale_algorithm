class Graph:
    def __init__(self):
        self.adj = {}  # user_id -> set of user_ids

    def add_node(self, user_id: str) -> None:
        if user_id not in self.adj:
            self.adj[user_id] = set()

    def add_edge(self, from_id: str, to_id: str) -> None:
        self.add_node(from_id)
        self.add_node(to_id)
        self.adj[from_id].add(to_id)

    def remove_edge(self, from_id: str, to_id: str) -> None:
        if from_id in self.adj:
            self.adj[from_id].discard(to_id)

    def neighbors(self, user_id: str) -> list[str]:
        return list(self.adj.get(user_id, set()))

    def bfs_recommend(self, start_id: str, depth: int = 2) -> dict[str, int]:
        if start_id not in self.adj:
            return {}
        following = self.adj[start_id]
        visited = {start_id}
        queue = [(start_id, 0)]
        candidates = {}
        head = 0
        while head < len(queue):
            current, d = queue[head]
            head += 1
            if d >= depth:
                continue
            for neighbor in self.adj.get(current, set()):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, d + 1))
                    if neighbor != start_id and neighbor not in following:
                        # 공통 친구 수 계산
                        common = len(self.adj.get(neighbor, set()) & following)
                        candidates[neighbor] = common
        return candidates

    def dijkstra_path(self, start_id: str, end_id: str, interest_map: dict = None) -> list[str]:
        if start_id not in self.adj or end_id not in self.adj:
            return []

        # 거리 테이블
        dist = {start_id: 0.0}
        prev = {start_id: None}
        visited = set()

        while True:
            # 방문하지 않은 노드 중 최소 거리 노드 선택
            current = None
            current_dist = float('inf')
            for node, d in dist.items():
                if node not in visited and d < current_dist:
                    current = node
                    current_dist = d

            if current is None:
                break
            if current == end_id:
                break

            visited.add(current)

            for neighbor in self.adj.get(current, set()):
                if neighbor in visited:
                    continue
                # 가중치: 1 / (공통 관심사 수 + 1)
                common_interests = 0
                if interest_map:
                    i1 = set(interest_map.get(current, []))
                    i2 = set(interest_map.get(neighbor, []))
                    common_interests = len(i1 & i2)
                weight = 1.0 / (common_interests + 1)
                new_dist = current_dist + weight
                if neighbor not in dist or new_dist < dist[neighbor]:
                    dist[neighbor] = new_dist
                    prev[neighbor] = current

        # 경로 역추적
        if end_id not in prev:
            return []
        path = []
        node = end_id
        while node is not None:
            path.append(node)
            node = prev[node]
        path.reverse()
        return path

    def dijkstra_all(self, start_id: str, interest_map: dict = None) -> dict[str, dict]:
        """단일 출발점에서 도달 가능한 모든 노드까지의 가중 최단거리/경로.

        간선 가중치 = 1 / (공통 관심사 수 + 1) → 관심사가 많이 겹칠수록 '가까운' 사이.
        반환: {node_id: {"dist": float, "path": [start, ..., node]}}  (start 자신은 제외)
        """
        if start_id not in self.adj:
            return {}

        dist = {start_id: 0.0}
        prev = {start_id: None}
        visited = set()

        while True:
            current = None
            current_dist = float("inf")
            for node, d in dist.items():
                if node not in visited and d < current_dist:
                    current = node
                    current_dist = d
            if current is None:
                break
            visited.add(current)

            for neighbor in self.adj.get(current, set()):
                if neighbor in visited:
                    continue
                common_interests = 0
                if interest_map:
                    i1 = set(interest_map.get(current, []))
                    i2 = set(interest_map.get(neighbor, []))
                    common_interests = len(i1 & i2)
                weight = 1.0 / (common_interests + 1)
                new_dist = current_dist + weight
                if neighbor not in dist or new_dist < dist[neighbor]:
                    dist[neighbor] = new_dist
                    prev[neighbor] = current

        result: dict[str, dict] = {}
        for node in dist:
            if node == start_id:
                continue
            # 경로 역추적
            path = []
            cur = node
            while cur is not None:
                path.append(cur)
                cur = prev.get(cur)
            path.reverse()
            result[node] = {"dist": dist[node], "path": path}
        return result
