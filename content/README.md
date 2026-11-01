# Nội dung

Seed (`pnpm db:seed`) nạp toàn bộ dữ liệu trong thư mục này vào database. Định dạng file câu hỏi: `src/jlpt/content.ts`,
từ vựng: `src/jlpt/vocab-content.ts`.

| Thư mục | Nguồn | Ghi chú |
| --- | --- | --- |
| `goda/` | GODA biên soạn | Mỗi file là một đề thi thử hoàn chỉnh (`exam`), kèm giải thích tiếng Việt. `answerFirst: true`: đáp án đúng viết ở vị trí đầu, seed tự đảo vị trí (cố định theo id). |
| `openjlpt/` | [OpenJLPT](https://github.com/iamcheyan/jlpt-drill) | Sinh bằng `pnpm content:openjlpt` — **không sửa tay**, sửa importer rồi chạy lại. |
| `vocab/` | OpenJLPT, JMdict, OVDP, Unihan, GODA | Từ vựng và kanji, xem mục "Từ vựng" bên dưới. |

## Từ vựng

| File | Nội dung | Sinh bằng |
| --- | --- | --- |
| `words-n5.json` … `words-n1.json` | 7.811 từ theo cấp, thứ tự trong file là thứ tự học (từ phổ biến trước) | `pnpm content:vocab` |
| `words-common.json` | 15.426 từ thông dụng ngoài danh sách JLPT, chỉ để tra cứu | `pnpm content:vocab` |
| `kanji.json` | 2.383 kanji: âm on/kun, số nét, bộ, nghĩa tiếng Anh, âm Hán Việt | `pnpm content:vocab` |
| `vi-ovdp.json` | Nghĩa tiếng Việt lọc tự động từ OVDP, theo id từ | `pnpm content:vocab` |
| `vi-goda-n5.txt`, `vi-goda-n4.txt` | Nghĩa tiếng Việt GODA soạn tay, dòng `từ\|cách đọc\|nghĩa; nghĩa` (cách đọc để trống nếu trùng mặt chữ). **Ưu tiên hơn OVDP.** | Sửa tay |
| `hanviet-goda.json` | Âm Hán Việt GODA soạn tay: bù chữ Unihan thiếu, đưa âm thông dụng lên đầu | Sửa tay |

Muốn sửa nghĩa của một từ ở cấp N3–N1: thêm dòng vào một file `vi-goda-*.txt` (seed đọc mọi file khớp tên này) rồi chạy lại `pnpm db:seed`.

**Chất lượng:** nghĩa N5, N4 do GODA soạn tay. Từ N3 trở lên và từ ngoài JLPT dùng nghĩa lọc tự động từ OVDP — phần lớn mục OVDP
được ghép máy qua từ điển Anh–Việt nên có thể sai sắc thái hoặc sai nghĩa. API trả `viSource` để giao diện báo rõ và luôn kèm nghĩa tiếng Anh.

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
- **OpenJLPT** — [evanclan/OpenJLPT](https://github.com/evanclan/OpenJLPT), CC BY-SA 4.0, commit
  `0d1d3410bec90bd4098a7c72de820543cb4f707c`: danh sách từ và kanji theo cấp (dựa trên danh sách của Jonathan Waller, không phải
  danh sách chính thức của JLPT), câu ví dụ từ [Tatoeba](https://tatoeba.org) (CC BY 2.0 FR). Các file `words-*.json` và `kanji.json`
  phát hành lại theo CC BY-SA 4.0.
- **JMdict / KANJIDIC2** — © Electronic Dictionary Research and Development Group, CC BY-SA 4.0, qua
  [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) bản `3.6.2+20261026175559`.
- **OVDP** — [Open Vietnamese Dictionary Project](https://sourceforge.net/projects/ovdp/), gói `NhatViet`, GNU GPL v2.
  Nghĩa từ nguồn này được giữ tách riêng trong `vi-ovdp.json` và file đó theo GPL v2.
- **Unihan** — © Unicode, Inc., Unicode License V3: trường `kVietnamese` cho âm Hán Việt.
