# GĐ2: tìm từ theo mô tả trên bộ test 100 câu

Bộ test: 100 câu. Recall@k = tỷ lệ câu có đáp án trong k kết quả đầu; MRR@10 = trung bình 1/(vị trí đáp án đúng đầu tiên). Khoảng trong ngoặc là khoảng tin cậy 95% (bootstrap).

| Hệ thống | Recall@1 | Recall@5 | Recall@10 | MRR@10 |
| --- | ---: | ---: | ---: | ---: |
| Bộ luật (hiện tại) | 29% | 30% (21%–39%) | 30% | 0.29 |
| AI e5-small | 34% | 55% (45%–64%) | 62% | 0.42 |
| AI e5-small, bỏ nghĩa OVDP | 50% | 69% (59%–78%) | 72% | 0.58 |
| Kết hợp (luật + AI có OVDP) | 43% | 59% (49%–69%) | 60% | 0.49 |
| Kết hợp (luật + AI bỏ OVDP) | 53% | 72% (63%–80%) | 72% | 0.60 |
| Kết hợp, luôn hiện gợi ý (AI bỏ OVDP) | 53% | 74% (65%–82%) | 76% | 0.61 |

**Recall@5 theo kiểu câu**

| Hệ thống | chinh-xac (22) | dong-nghia (18) | khong-dau (10) | mo-ta (35) | tinh-huong (15) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bộ luật (hiện tại) | 100% | 0% | 80% | 0% | 0% |
| AI e5-small | 100% | 56% | 20% | 43% | 40% |
| AI e5-small, bỏ nghĩa OVDP | 100% | 72% | 20% | 63% | 67% |
| Kết hợp (luật + AI có OVDP) | 100% | 39% | 90% | 43% | 40% |
| Kết hợp (luật + AI bỏ OVDP) | 100% | 50% | 90% | 63% | 67% |
| Kết hợp, luôn hiện gợi ý (AI bỏ OVDP) | 100% | 61% | 90% | 63% | 67% |

**Recall@5 theo cấp**

| Hệ thống | N4 (50) | N5 (50) |
| --- | ---: | ---: |
| Bộ luật (hiện tại) | 30% | 30% |
| AI e5-small | 52% | 58% |
| AI e5-small, bỏ nghĩa OVDP | 72% | 66% |
| Kết hợp (luật + AI có OVDP) | 60% | 58% |
| Kết hợp (luật + AI bỏ OVDP) | 76% | 68% |
| Kết hợp, luôn hiện gợi ý (AI bỏ OVDP) | 80% | 68% |

`Kết hợp` = 5 kết quả của bộ luật, cộng tối đa 5 gợi ý theo nghĩa không trùng (hiện khi bộ luật trả ít hơn 3 kết quả
hoặc câu gõ dài từ 3 tiếng; bản "luôn hiện" thì lúc nào cũng hiện). Với các dòng `Kết hợp`, Recall@10 là tỷ lệ câu mà
người học nhìn thấy đáp án ở một trong hai mục.

## Nhận xét (2026-11-11, model intfloat/multilingual-e5-small@614241f, chưa fine-tune)

1. **Tìm theo nghĩa giúp rõ rệt:** Recall@5 từ 30% (bộ luật) lên 69% (AI, bỏ nghĩa OVDP). Câu đồng nghĩa 0% → 72%,
   mô tả 0% → 63%, tình huống 0% → 67%. Hai khoảng tin cậy không chồng nhau nên đây không phải may rủi.
2. **Gõ không dấu là điểm yếu của model (20%)**, vì model chủ yếu học tiếng Việt có dấu. Bộ luật làm tốt việc này
   (80%), nên ghép hai cách cho 90% ở nhóm câu này.
3. **Dữ liệu bẩn làm model kém đi:** đưa nghĩa OVDP (lọc tự động, còn lỗi) của từ N3–N1 vào đoạn chữ thì Recall@5
   chỉ còn 55%. Ví dụ 教師 (giáo viên) mang nghĩa OVDP "sự kiêu hãnh". Đúng câu "rác vào, rác ra" (K3).
4. **Con số có thể hơi lạc quan:** việc chọn biến thể "bỏ OVDP" và chọn cách ghép đều dựa trên chính bộ test này
   (không có tập validation riêng, K7). Cần một bộ test v2 do người khác soạn để xác nhận.
5. **Bộ test v1 còn sót đáp án đúng:** 雨具 (đồ đi mưa, N1) cho «đồ che mưa», 稀 (hiếm, N2) cho «hiếm khi gặp».
   Không sửa bộ v1 vì đã khoá; bộ v2 nên bổ sung.
6. **Lỗi tiêu biểu (xem `gd2-search-errors.md`):** từ nhiều nghĩa trong tiếng Việt («có vị như đường» ra 道 con
   *đường* và 方 *vị* = người; «mắc cỡ» ra サイズ vì *cỡ* = kích thước); phủ định («không có ánh sáng» ra 光 ánh
   sáng); tiếng địa phương («hộc tủ», «hiền hậu»). Đây là chỗ fine-tune ở GĐ3 có thể cải thiện.
