# GODA JLPT — Backend

API cho web luyện đề JLPT N5–N1. NestJS 12 (monolith, ESM) · TypeORM 1.1 · PostgreSQL 17.

Frontend: [FE_GODA](https://github.com/lethanh2006/FE_GODA).

## Chạy local

Yêu cầu: Node ≥ 22, pnpm 11, Docker (hoặc PostgreSQL ≥ 13 có sẵn).

```bash
pnpm install
cp .env.example .env         # rồi đặt JWT_SECRET (≥ 32 ký tự)

docker compose up -d --wait  # PostgreSQL 17 (goda / 123456, database goda_jlpt); --wait chờ DB sẵn sàng
pnpm migration:run           # tạo bảng
pnpm db:seed                 # nạp ~8.470 câu hỏi và 10 đề thi thử
pnpm dev                     # http://localhost:4000/api
```

- Swagger: http://localhost:4000/api/docs
- Health check: http://localhost:4000/api/health

## Xem dữ liệu bằng pgAdmin

Tạo server mới (Register → Server), tab **Connection**:

| Trường | Giá trị |
| --- | --- |
| Host name/address | `localhost` |
| Port | `5432` |
| Maintenance database | `goda_jlpt` |
| Username | `goda` |
| Password | `123456` |

Bảng nằm trong `goda_jlpt → Schemas → public → Tables`, tên bảng và cột dạng snake_case
(`users`, `questions`, `attempts`, `attempt_answers`…). Bảng `migrations` do TypeORM quản lý, không sửa tay.

## Biến môi trường

| Biến | Mặc định | Ghi chú |
| --- | --- | --- |
| `DATABASE_URL` | — | Bắt buộc |
| `JWT_SECRET` | — | Bắt buộc, ≥ 32 ký tự |
| `PORT` | `4000` | |
| `CORS_ORIGIN` | `http://localhost:3000` | Nhiều origin phân tách bằng dấu phẩy. Frontend gọi qua proxy cùng origin nên thường không cần. |
| `JWT_EXPIRES_DAYS` | `30` | Thời hạn phiên đăng nhập |
| `COOKIE_SECURE` | `false` | Đặt `true` khi chạy HTTPS |

## Scripts

| Lệnh | Mô tả |
| --- | --- |
| `pnpm dev` | Chạy dev (watch) |
| `pnpm build` / `pnpm start:prod` | Build và chạy bản production |
| `pnpm test` / `pnpm test:e2e` | Unit test / e2e (Vitest) |
| `pnpm lint` | oxlint (type-aware) |
| `pnpm migration:run` / `pnpm migration:revert` | Áp / hoàn tác migration |
| `pnpm migration:show` | Liệt kê migration và trạng thái |
| `pnpm migration:generate src/database/migrations/<Tên>` | Sinh migration từ thay đổi entity (so với DB hiện tại) |
| `pnpm db:seed` | Nạp `content/` vào DB và dựng đề thi (chạy lại an toàn) |
| `pnpm content:openjlpt` | Tải và làm sạch lại dữ liệu OpenJLPT vào `content/openjlpt/` |

## API chính

Mọi route có tiền tố `/api`. Đăng nhập bằng cookie httpOnly `goda_token` (hoặc header `Authorization: Bearer`).
Route không ghi chú là công khai — khách vẫn làm bài được.

| Method | Route | Mô tả |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Đăng ký / đăng nhập / đăng xuất |
| GET | `/auth/session` | Phiên hiện tại (`{ user }`, `null` nếu là khách) |
| PATCH | `/users/me` 🔒 | Đổi tên hiển thị, cấp độ mục tiêu |
| GET | `/catalog` | Số câu theo cấp độ / dạng bài, cấu trúc đề |
| GET | `/exams?level=`, `/exams/:slug` | Danh sách / chi tiết đề thi thử (kèm tiến độ nếu đã đăng nhập) |
| POST | `/attempts` | Tạo lượt làm: `exam`, `random_exam`, `practice`, `retry` |
| GET | `/attempts/:id` | Đề bài; đáp án chỉ trả về sau khi nộp hoặc khi đã xem đáp án |
| PUT | `/attempts/:id/answers` | Lưu đáp án / đánh dấu |
| POST | `/attempts/:id/reveal` | Xem đáp án ngay (chế độ luyện tập) |
| POST | `/attempts/:id/submit` | Nộp bài và chấm điểm |
| POST | `/attempts/claim` 🔒 | Gắn lượt làm lúc còn là khách vào tài khoản |
| GET | `/me/stats`, `/me/attempts` 🔒 | Thống kê và lịch sử làm bài |
| GET/PUT/DELETE | `/bookmarks[/:questionId]` 🔒 | Câu hỏi đã lưu |
| POST | `/questions/:id/reports` | Báo lỗi câu hỏi |
| GET/PATCH | `/admin/reports[/:id]` 🔒 admin | Xử lý báo lỗi |

Muốn có tài khoản admin: đổi cột `role` thành `ADMIN` trong bảng `users` (vd bằng pgAdmin).

## Cấu trúc

```
content/                 nội dung câu hỏi (JSON) — xem content/README.md
  goda/                  đề GODA biên soạn, mỗi file một đề
  openjlpt/              ngân hàng mở rộng (sinh bằng importer, không sửa tay)
scripts/
  seed.ts                nạp content/ và dựng đề thi
  openjlpt/              importer + làm sạch OpenJLPT (kana, kanji đồng âm)
typeorm.config.ts        DataSource cho TypeORM CLI
src/
  database/              entity, enum, migration, naming strategy (snake_case)
  jlpt/                  domain: dạng bài, cấu trúc đề N5–N1, ước tính điểm, chọn câu
  common/                auth guard, decorator, tiện ích
  modules/               auth, users, catalog, exams, attempts, me, bookmarks, reports, health
```

## Đổi cấu trúc database

1. Sửa entity trong `src/database/entities/` (enum ở `src/database/enums.ts`).
2. `pnpm migration:generate src/database/migrations/<TênThayĐổi>` rồi đọc lại file sinh ra: với enum dùng chung
   nhiều bảng (`jlpt_level`, `question_type`…), TypeORM có thể sinh lệnh `CREATE TYPE`/`ALTER TYPE` lặp — giữ một lần.
3. `pnpm migration:run`.

## Thêm đề thi mới

1. Tạo `content/goda/<cấp>-<số>.json` theo định dạng `src/jlpt/content.ts`. Với `"answerFirst": true`, đáp án đúng
   luôn viết ở vị trí đầu, seed tự đảo vị trí (cố định theo id).
2. Số câu mỗi dạng bài nên khớp cấu trúc trong `src/jlpt/blueprints.ts`. Seed sẽ cảnh báo nếu lệch.
3. Chạy `pnpm db:seed`. Đề có slug `<cấp>-de-<số>`, ví dụ `n3-de-02`.
