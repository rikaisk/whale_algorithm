from algorithms.bst import BST


class TestBST:
    def test_insert_and_inorder(self):
        bst = BST()
        bst.insert((3.0, "c"))
        bst.insert((1.0, "a"))
        bst.insert((2.0, "b"))
        assert bst.inorder() == [(1.0, "a"), (2.0, "b"), (3.0, "c")]

    def test_delete_leaf(self):
        bst = BST()
        bst.insert((2.0, "b"))
        bst.insert((1.0, "a"))
        bst.insert((3.0, "c"))
        bst.delete((1.0, "a"))
        assert bst.inorder() == [(2.0, "b"), (3.0, "c")]

    def test_delete_node_with_one_child(self):
        bst = BST()
        bst.insert((2.0, "b"))
        bst.insert((1.0, "a"))
        bst.insert((3.0, "c"))
        bst.insert((4.0, "d"))
        bst.delete((3.0, "c"))
        assert bst.inorder() == [(1.0, "a"), (2.0, "b"), (4.0, "d")]

    def test_delete_node_with_two_children(self):
        bst = BST()
        bst.insert((2.0, "b"))
        bst.insert((1.0, "a"))
        bst.insert((4.0, "d"))
        bst.insert((3.0, "c"))
        bst.insert((5.0, "e"))
        bst.delete((4.0, "d"))
        assert bst.inorder() == [(1.0, "a"), (2.0, "b"), (3.0, "c"), (5.0, "e")]

    def test_delete_root(self):
        bst = BST()
        bst.insert((2.0, "b"))
        bst.insert((1.0, "a"))
        bst.insert((3.0, "c"))
        bst.delete((2.0, "b"))
        result = bst.inorder()
        assert (1.0, "a") in result
        assert (3.0, "c") in result
        assert len(result) == 2

    def test_range_query(self):
        bst = BST()
        bst.insert((1.0, "a"))
        bst.insert((2.0, "b"))
        bst.insert((3.0, "c"))
        bst.insert((4.0, "d"))
        bst.insert((5.0, "e"))
        result = bst.range_query(2.0, 4.0)
        assert sorted(result) == [(2.0, "b"), (3.0, "c"), (4.0, "d")]

    def test_range_query_empty(self):
        bst = BST()
        bst.insert((1.0, "a"))
        bst.insert((5.0, "e"))
        assert bst.range_query(2.0, 4.0) == []

    def test_empty_tree(self):
        bst = BST()
        assert bst.inorder() == []
        assert bst.range_query(0, 10) == []

    def test_duplicate_timestamp_different_id(self):
        bst = BST()
        bst.insert((1.0, "a"))
        bst.insert((1.0, "b"))
        result = bst.inorder()
        assert len(result) == 2
