# GODA JLPT — Backend

API cho web luyện đề JLPT N5–N1. NestJS 12 (monolith, ESM) · Prisma 7 · PostgreSQL 17.

Frontend: [FE_GODA](https://github.com/lethanh2006/FE_GODA).

## Chạy local

Yêu cầu: Node ≥ 22, pnpm 11, PostgreSQL (Docker hoặc `prisma dev`).

```bash
pnpm install                 # tự chạy prisma generate
cp .env.example .env         # rồi đặt JWT_SECRET (≥ 32 ký tự)

# Database — chọn một trong hai:
docker compose up -d         # PostgreSQL 17, khớp DATABASE_URL trong .env.example
pnpm exec prisma dev -d      # hoặc Postgres cục bộ không cần Docker; sửa DATABASE_URL theo URL "TCP" nó in ra

pnpm exec prisma migrate deploy   # tạo bảng
pnpm db:seed                      # nạp ~7.850 câu hỏi và 5 đề thi thử
pnpm dev                          # http://localhost:4000/api
```

- Swagger: http://localhost:4000/api/docs
- Health check: http://localhost:4000/api/health

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
| `pnpm prisma:migrate` | `prisma migrate dev` — tạo migration khi đổi schema |
| `pnpm prisma:deploy` | `prisma migrate deploy` — áp migration (production) |
| `pnpm db:seed` | Nạp `content/` vào DB và dựng đề thi (chạy lại an toàn) |
| `pnpm content:openjlpt` | Tải và làm sạch lại dữ liệu OpenJLPT vào `content/openjlpt/` |
| `pnpm prisma:studio` | Xem / sửa dữ liệu |

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

Muốn có tài khoản admin: đổi `role` thành `ADMIN` trong bảng `User` (vd bằng `pnpm prisma:studio`).

## Cấu trúc

```
content/                 nội dung câu hỏi (JSON) — xem content/README.md
  goda/                  đề GODA biên soạn, mỗi file một đề
  openjlpt/              ngân hàng mở rộng (sinh bằng importer, không sửa tay)
prisma/
  schema.prisma          data model
  migrations/
  seed.ts                nạp content/ và dựng đề thi
scripts/openjlpt/        importer + làm sạch OpenJLPT (kana, kanji đồng âm)
src/
  jlpt/                  domain: dạng bài, cấu trúc đề N5–N1, ước tính điểm, chọn câu
  common/                auth guard, decorator, tiện ích
  modules/               auth, users, catalog, exams, attempts, me, bookmarks, reports, health
```

## Thêm đề thi mới

1. Tạo `content/goda/<cấp>-<số>.json` theo định dạng `src/jlpt/content.ts`. Với `"answerFirst": true`, đáp án đúng
   luôn viết ở vị trí đầu, seed tự đảo vị trí (cố định theo id).
2. Số câu mỗi dạng bài nên khớp cấu trúc trong `src/jlpt/blueprints.ts`. Seed sẽ cảnh báo nếu lệch.
3. Chạy `pnpm db:seed`. Đề có slug `<cấp>-de-<số>`, ví dụ `n3-de-02`.
