# Dữ liệu cho phần AI

| File | Nội dung | Có trong git |
| --- | --- | --- |
| `words.jsonl` | Từ vựng JLPT N5–N1, sinh bằng `pnpm ai:export-words` | Không (sinh lại được) |
| `test-queries.jsonl` | **Bộ test** 100 câu "tìm từ theo mô tả" (GĐ0 trong kế hoạch AI) | Có |

## Bộ test `test-queries.jsonl`

Mỗi dòng là một câu người học có thể gõ vào ô tra từ, kèm các từ được tính là đúng:

```json
{"id": "q021", "q": "đồ che mưa", "kind": "mo-ta", "group": "N5", "answers": ["<id từ>"], "answerWords": ["傘"], "author": "claude-draft"}
```

- `kind`: `chinh-xac` (gõ đúng từ tiếng Việt có trong nghĩa GODA), `dong-nghia` (từ khác cùng nghĩa, kể cả từ miền Nam),
  `mo-ta` (mô tả bằng lời), `tinh-huong` (cụm từ theo tình huống), `khong-dau` (gõ không dấu).
- `group`: cấp JLPT của đáp án chính. Có 50 câu N5 và 50 câu N4.
- `answers`: id trong bảng `words`. Liệt kê mọi từ JLPT đúng với câu gõ để không phạt hệ thống trả từ đồng nghĩa hợp lệ.
- `author`: `claude-draft` là bản nháp Claude soạn ngày 2026-11-11, **trước khi** chạy bộ tra hay model nào trên bộ này.

**Quy tắc:** bộ test đã khoá. Không sửa câu hay đáp án để model "đỗ"; không dùng câu nào ở đây làm dữ liệu train.
Muốn thay đổi thì tạo bộ mới (ví dụ `test-queries.v2.jsonl`) và đo lại mọi hệ thống trên bộ mới. Nên nhờ một người
học khác soạn thêm câu, vì người viết test không nên là người chỉnh model.
