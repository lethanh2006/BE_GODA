# Baseline GĐ0: bộ tra từ theo luật trên bộ test 100 câu

Bộ test: 100 câu. Recall@k = tỷ lệ câu có đáp án trong k kết quả đầu; MRR@10 = trung bình 1/(vị trí đáp án đúng đầu tiên). Khoảng trong ngoặc là khoảng tin cậy 95% (bootstrap).

| Hệ thống | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
| --- | ---: | ---: | ---: | ---: |
| Bộ tra theo luật (hiện tại) | 29% | 30% (21%–39%) | 30% | 0.29 |

**Recall@5 theo kiểu câu**

| Hệ thống | chinh-xac (22) | dong-nghia (18) | khong-dau (10) | mo-ta (35) | tinh-huong (15) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bộ tra theo luật (hiện tại) | 100% | 0% | 80% | 0% | 0% |

**Recall@5 theo cấp**

| Hệ thống | N4 (50) | N5 (50) |
| --- | ---: | ---: |
| Bộ tra theo luật (hiện tại) | 30% | 30% |
