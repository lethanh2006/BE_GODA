"""Kiểm tra thước đo bằng các ví dụ tính tay. Chạy: python -m unittest discover -s tests -v (trong thư mục ai/)."""

import unittest

from goda_ai.evaluate import bootstrap_ci, first_hit, recall_at, reciprocal_rank, score_run, summarize


class MetricTest(unittest.TestCase):
    def test_dap_an_dung_dau(self):
        self.assertEqual(first_hit(["a", "b"], ["a"]), 1)
        self.assertEqual(recall_at(["a", "b"], ["a"], 1), 1.0)
        self.assertEqual(reciprocal_rank(["a", "b"], ["a"]), 1.0)

    def test_dap_an_o_vi_tri_3(self):
        ranked = ["x", "y", "a", "z"]
        self.assertEqual(recall_at(ranked, ["a"], 1), 0.0)
        self.assertEqual(recall_at(ranked, ["a"], 5), 1.0)
        self.assertAlmostEqual(reciprocal_rank(ranked, ["a"]), 1 / 3)

    def test_nhieu_dap_an_tinh_dap_an_dau_tien(self):
        self.assertEqual(first_hit(["x", "b", "a"], ["a", "b"]), 2)

    def test_khong_co_ket_qua(self):
        self.assertIsNone(first_hit([], ["a"]))
        self.assertEqual(recall_at([], ["a"], 10), 0.0)
        self.assertEqual(reciprocal_rank([], ["a"]), 0.0)

    def test_mrr_chi_tinh_10_ket_qua_dau(self):
        ranked = [f"x{i}" for i in range(10)] + ["a"]
        self.assertEqual(reciprocal_rank(ranked, ["a"]), 0.0)

    def test_id_trung_bi_tu_choi(self):
        with self.assertRaises(ValueError):
            first_hit(["a", "a"], ["a"])

    def test_cau_thieu_trong_run_tinh_la_truot(self):
        queries = [
            {"id": "q1", "q": "", "kind": "mo-ta", "group": "N5", "answers": ["a"]},
            {"id": "q2", "q": "", "kind": "mo-ta", "group": "N5", "answers": ["b"]},
        ]
        rows = score_run({"q1": ["a"]}, queries)
        self.assertEqual(summarize(rows)["recall@1"], 0.5)
        self.assertEqual(summarize(rows)["mrr"], 0.5)

    def test_bootstrap_on_dinh_va_nam_trong_0_1(self):
        values = [1.0] * 70 + [0.0] * 30
        lo, hi = bootstrap_ci(values)
        self.assertEqual((lo, hi), bootstrap_ci(values))
        self.assertTrue(0.0 <= lo <= 0.7 <= hi <= 1.0)


if __name__ == "__main__":
    unittest.main()
