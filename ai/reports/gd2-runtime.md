# GĐ2 bước 2.3: chạy model ở đâu khi người dùng gõ?

Đo ngày 2026-11-11 trên máy phát triển (4 nhân CPU, Linux). Script đo nằm ngoài repo. Cách đo: nạp model
`Xenova/multilingual-e5-small` bản ONNX nén int8 (`dtype: "q8"`, 118 MB) bằng Transformers.js 4.3.2
(onnxruntime-node 1.30) rồi mã hoá 100 câu của bộ test, so với vector mục từ do Python tính.

| Chỉ số | Kết quả |
| --- | --- |
| Độ chính xác so với Python | Vector câu gõ giống nhau tới cosine 0,9965; Recall@5 68% (Python: 69%) |
| Thời gian nạp model (đã có sẵn trên đĩa) | khoảng 2 giây |
| Độ trễ mỗi câu khi model đã nạp | p50 8–14 ms, p95 24–67 ms (4 nhân; Render Free chỉ có 0,1 CPU nên sẽ chậm hơn nhiều lần) |
| RAM tăng thêm khi nạp model | khoảng **380 MB** (tiến trình từ 107 MB lên 490 MB); tắt memory arena và prepacking không giảm |
| RAM backend GODA hiện tại | 172 MB (đã nạp chỉ mục 23.237 từ và file từ liên quan) |
| Dung lượng thư viện | `node_modules` 745 MB (onnxruntime-node 548 MB) |

**Kết luận:** phương án A (chạy model ngay trong backend NestJS) **không vừa** Render Free 512 MB: 172 + 380 ≈ 550 MB,
tiến trình sẽ bị tắt vì hết bộ nhớ và kéo sập cả API. Chất lượng và tốc độ thì đạt.

Nguyên nhân chính: bảng từ vựng của model có 250.002 token × 384 số. File nén int8 chỉ khoảng 96 MB cho phần này,
nhưng khi chạy, ONNX Runtime bung ra số thực đầy đủ (khoảng 384 MB).

## Các hướng còn lại (cần quyết định)

| Hướng | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| B. Chạy trong trình duyệt (Transformers.js + WASM), người dùng bấm mới tải | Miễn phí, câu gõ không rời máy người học, server không tốn gì | Lần đầu tải khoảng 120 MB; tab trình duyệt tốn khoảng 400 MB RAM, điện thoại yếu có thể không chạy |
| C. Gọi dịch vụ embedding qua API | Server nhẹ, làm nhanh | Cần tài khoản và khoá API; có giới hạn lượt hoặc tốn tiền; câu gõ gửi ra ngoài; phải tính lại vector mục từ bằng đúng model của dịch vụ |
| A'. Thu gọn bảng từ vựng của model (chỉ giữ token tiếng Việt, Nhật, Anh) rồi chạy trong backend | Không phụ thuộc dịch vụ ngoài; là một đề tài nhỏ về nén model, hợp để báo cáo lab | Việc kỹ thuật khó nhất trong các hướng; phải đo lại độ chính xác sau khi thu gọn |
| D. Nâng gói Render có nhiều RAM hơn | Không phải sửa gì | Tốn tiền hằng tháng |
