"""Kiểm tra các hàm không cần model: mẫu đoạn chữ, tìm láng giềng, cách ghép kết quả."""

import unittest

import numpy as np

from goda_ai.related import corpus_sha256, nearest
from goda_ai.search import hybrid, rank, triggered
from goda_ai.text import word_text


def word(wid, w, reading, vi=(), en=(), source="goda", freq=1):
    return {"id": wid, "word": w, "reading": reading, "meaningsVi": list(vi), "meaningsEn": list(en), "viSource": source, "freq": freq}


class TextTest(unittest.TestCase):
    def test_mau_word_v1(self):
        w = word("a", "傘", "かさ", ["cái ô, cái dù"], ["umbrella"])
        self.assertEqual(word_text(w), "傘 (かさ). Nghĩa: cái ô, cái dù. English: umbrella.")

    def test_tu_viet_bang_kana_khong_lap_cach_doc(self):
        self.assertTrue(word_text(word("a", "トイレ", "トイレ", ["nhà vệ sinh"], ["toilet"])).startswith("トイレ. Nghĩa"))

    def test_bo_nghia_ovdp_khi_yeu_cau(self):
        w = word("a", "教師", "きょうし", ["nghĩa sai"], ["teacher"], source="ovdp")
        self.assertEqual(word_text(w, ("goda",)), "教師 (きょうし). English: teacher.")

    def test_chuan_hoa_unicode_va_khoang_trang(self):
        decomposed = "cái  ô"  # chữ ô viết bằng hai ký tự
        self.assertIn("cái ô", word_text(word("a", "傘", "かさ", [decomposed])))


class NearestTest(unittest.TestCase):
    def setUp(self):
        self.words = [
            word("a", "雨", "あめ"),
            word("b", "傘", "かさ", freq=5),
            word("c", "傘", "かさ"),  # trùng mặt chữ và cách đọc với b
            word("d", "机", "つくえ", freq=2),
            word("e", "椅子", "いす", freq=1),
        ]
        v = np.array([[1, 0], [0.9, 0.1], [0.9, 0.1], [0, 1], [0, 1]], dtype=np.float32)
        self.vectors = v / np.linalg.norm(v, axis=1, keepdims=True)

    def test_bo_chinh_no_va_muc_trung_mat_chu_cach_doc(self):
        result = nearest(self.vectors, self.words, k=4)
        self.assertNotIn("b", [wid for wid, _ in result["b"]])
        self.assertNotIn("c", [wid for wid, _ in result["b"]])
        self.assertEqual(result["a"][0][0], "c")  # b và c cùng điểm: từ phổ biến hơn (freq nhỏ) lên trước

    def test_cung_diem_thi_tu_pho_bien_truoc(self):
        self.assertEqual([wid for wid, _ in nearest(self.vectors, self.words, k=2)["a"]], ["c", "b"])
        self.assertEqual(nearest(self.vectors, self.words, k=1)["d"][0][0], "e")

    def test_gioi_han_k_va_diem_giam_dan(self):
        result = nearest(self.vectors, self.words, k=3)
        for picks in result.values():
            self.assertLessEqual(len(picks), 3)
            scores = [s for _, s in picks]
            self.assertEqual(scores, sorted(scores, reverse=True))

    def test_dau_van_tay_doi_khi_nghia_doi(self):
        changed = [dict(w) for w in self.words]
        changed[0]["meaningsVi"] = ["mưa"]
        self.assertNotEqual(corpus_sha256(self.words), corpus_sha256(changed))
        self.assertEqual(corpus_sha256(self.words), corpus_sha256(list(reversed(self.words))))


class SearchTest(unittest.TestCase):
    def test_rank_lay_k_ket_qua_gan_nhat(self):
        q = np.array([[1, 0]], dtype=np.float32)
        w = np.array([[0, 1], [1, 0], [0.7, 0.7]], dtype=np.float32)
        self.assertEqual(rank(q, w, ["x", "y", "z"], k=2), [["y", "z"]])

    def test_dieu_kien_goi_tim_theo_nghia(self):
        self.assertTrue(triggered("đồ che mưa", ["a", "b", "c"]))  # câu dài 3 tiếng
        self.assertTrue(triggered("dơ", ["a"]))  # bộ luật trả ít hơn 3 kết quả
        self.assertFalse(triggered("xe đạp", ["a", "b", "c"]))

    def test_ghep_giu_nguyen_ket_qua_luat_va_khong_trung(self):
        rule = ["r1", "r2", "r3", "r4", "r5", "r6"]
        self.assertEqual(hybrid("xe đạp", rule, ["s1"]), rule[:5])
        self.assertEqual(hybrid("đồ che mưa", rule, ["r1", "s1", "s2"]), rule[:5] + ["s1", "s2"])
        self.assertEqual(hybrid("xe đạp", rule, ["s1"], always=True), rule[:5] + ["s1"])


if __name__ == "__main__":
    unittest.main()
