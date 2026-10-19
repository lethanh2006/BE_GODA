# Nội dung câu hỏi

Seed (`pnpm db:seed`) nạp toàn bộ file JSON trong thư mục này vào database. Định dạng file: `src/jlpt/content.ts`.

| Thư mục | Nguồn | Ghi chú |
| --- | --- | --- |
| `goda/` | GODA biên soạn | Mỗi file là một đề thi thử hoàn chỉnh (`exam`), kèm giải thích tiếng Việt. `answerFirst: true`: đáp án đúng viết ở vị trí đầu, seed tự đảo vị trí (cố định theo id). |
| `openjlpt/` | [OpenJLPT](https://github.com/iamcheyan/jlpt-drill) | Sinh bằng `pnpm content:openjlpt` — **không sửa tay**, sửa importer rồi chạy lại. |

## Quy ước đề bài

- `《…》` phần gạch chân (漢字読み, 表記, 言い換え)
- `（　　）` chỗ trống; `（　3　）` chỗ trống số 3 trong bài đọc (文章の文法)
- `＿＿` ô sắp xếp và `★` ô cần chọn (文の組み立て)

## Giấy phép & ghi nguồn

- **OpenJLPT** — iamcheyan/jlpt-drill, MIT License (theo README của dự án), commit
  `d3e58db85a3496c5b13966028b6233565cbe7e57`. Câu hỏi do AI sinh; GODA đã lọc câu lỗi, sinh lại phương án nhiễu
  cho 漢字読み / 表記, bỏ lời giải tiếng Trung và các dạng bài có tỷ lệ lỗi cao.
- **KANJIDIC** — © Electronic Dictionary Research and Development Group, CC BY-SA 4.0, qua
  [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data) (MIT). Chỉ dùng khi chạy importer để tìm
  chữ Hán đồng âm làm phương án nhiễu cho dạng 表記; dữ liệu kanji không được phân phối lại trong repo.
- **Đề GODA** (`goda/`) — biên soạn riêng cho GODA JLPT.
