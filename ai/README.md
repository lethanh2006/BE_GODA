# Phần AI của GODA

Thư mục này chứa phần **xử lý ngôn ngữ (NLP)** của GODA: biến từ vựng thành vector (embedding), gợi ý từ liên quan và
tìm từ theo mô tả tiếng Việt. Kế hoạch đầy đủ và giải thích từng khái niệm (K1–K34) nằm ở
`GODA_AI_TRAINING_PLAN.md` ở thư mục gốc workspace. File này chỉ hướng dẫn cách chạy.

Server NestJS **không chạy model**. Python chạy trên máy bạn, tính sẵn kết quả thành file JSON nhỏ trong
`backend/assets/ai/`, backend chỉ đọc file đó (khái niệm K31 "artifact").

## Cấu trúc

| Đường dẫn | Việc | Khái niệm |
| --- | --- | --- |
| `data/words.jsonl` | Từ vựng JLPT, sinh bằng `pnpm ai:export-words` (không đưa vào git) | K3 dữ liệu |
| `data/test-queries.jsonl` | Bộ test 100 câu "tìm từ theo mô tả", **đã khoá** (xem `data/README.md`) | K7 test |
| `goda_ai/text.py` | Biến một từ thành đoạn chữ cố định, ví dụ `傘 (かさ). Nghĩa: cái ô, cái dù. English: umbrella.` | K15 |
| `goda_ai/model.py` | Tải model `intfloat/multilingual-e5-small` (ghim phiên bản), biến chữ thành vector 384 số | K13, K15 |
| `goda_ai/related.py` | GĐ1: tính 12 từ gần nghĩa nhất cho mỗi từ N5–N4 → `assets/ai/related-words.v1.json` | K16, K17 |
| `goda_ai/search.py` | GĐ2: đo tìm từ theo mô tả và cách ghép với bộ tra hiện tại trên bộ test | K18 |
| `goda_ai/evaluate.py` | Chấm mọi hệ thống cùng một cách: Recall@k, MRR, khoảng tin cậy | K9, K10 |
| `goda_ai/judge.py` | Phiếu chấm mù cho "từ liên quan" và tính Precision@6 | K10 |
| `reports/` | Báo cáo kết quả (đưa vào git) | |
| `runs/`, `.cache/`, `.venv/` | Kết quả trung gian, model tải về, môi trường Python (không đưa vào git) | |

## Chạy từ đầu

```bash
cd backend
pnpm ai:export-words          # từ vựng → ai/data/words.jsonl
pnpm ai:rank-rule             # baseline: bộ tra theo luật trên bộ test → ai/runs/rule.jsonl

cd ai
python3 -m venv .venv
.venv/bin/pip install torch==2.15.0 --index-url https://download.pytorch.org/whl/cpu
.venv/bin/pip install -r requirements.txt

.venv/bin/python -m unittest discover -s tests -v       # kiểm tra các hàm không cần model
.venv/bin/python -m goda_ai.related                     # GĐ1: lần đầu tải model khoảng 470 MB vào .cache/hf
.venv/bin/python -m goda_ai.search                      # GĐ2: đo trên bộ test
.venv/bin/python -m goda_ai.evaluate "Bộ luật=runs/rule.jsonl" "AI=runs/e5-small.jsonl" "Kết hợp=runs/hybrid.jsonl"
.venv/bin/python -m goda_ai.judge make                  # phiếu chấm mù cho từ liên quan
```

Máy 4 nhân CPU, không cần GPU: tạo embedding cho 7.811 từ mất khoảng một phút. Vector được lưu đệm trong
`.cache/emb/`, chạy lại sẽ nhanh.

## Bật "Từ liên quan để học tiếp" trên web

1. Chạy `goda_ai.related`, rồi tự chấm phiếu `reports/gd1-related-judging.csv` (cột `huu_ich`: 1 hoặc 0) và chạy
   `goda_ai.judge score`. Chỉ bật khi Precision@6 của AI cao hơn rõ hai cách đơn giản (bước 1.4 trong kế hoạch).
2. Commit file `assets/ai/related-words.v1.json` (backend đọc nó, Docker image có chép thư mục `assets/`).
3. Đặt biến môi trường `RELATED_WORDS_ENABLED=true` cho backend (local: file `.env`; Render: Environment), rồi khởi
   động lại. Muốn tắt thì đặt lại `false`: trang từ điển vẫn chạy bình thường.

Đổi model, mẫu đoạn chữ hoặc dữ liệu từ vựng thì phải chạy lại `goda_ai.related` và commit file mới.
