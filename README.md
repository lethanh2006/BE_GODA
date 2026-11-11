# GODA JLPT — Backend

API cho web luyện thi JLPT N5–N1, học từ vựng và tra từ tiếng Nhật. NestJS 12 (monolith, ESM) · TypeORM 1.1 · PostgreSQL 17.

Frontend: [FE_GODA](https://github.com/lethanh2006/FE_GODA).

## Chạy local

Yêu cầu: Node ≥ 22, pnpm 11, Docker (hoặc PostgreSQL ≥ 13 có sẵn).

```bash
pnpm install
cp .env.example .env         # rồi đặt JWT_SECRET (≥ 32 ký tự)

docker compose up -d --wait  # PostgreSQL 17 (goda / 123456, database goda_jlpt); --wait chờ DB sẵn sàng
pnpm migration:run           # tạo bảng
pnpm db:seed                 # nạp ~8.470 câu hỏi, 10 đề thi thử, ~23.200 từ và 2.383 kanji
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
| `GOOGLE_CLIENT_ID` | — | OAuth Client ID loại Web application; cần để bật Google login |

### Đăng nhập Google

Tạo OAuth client loại **Web application** trong Google Cloud Console, thêm domain frontend vào **Authorized JavaScript origins** (ví dụ `http://localhost:3000`). Đặt cùng Client ID vào `backend/.env` (`GOOGLE_CLIENT_ID`) và `frontend/.env.local` (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`); không cần Client Secret hay redirect URI. Chạy `pnpm migration:run` cho backend, rồi khởi động lại cả hai ứng dụng. Trên production, đặt hai biến tương ứng trong môi trường deploy và thêm origin HTTPS của frontend vào OAuth client.

Nếu email đã có tài khoản mật khẩu, hãy đăng nhập bằng mật khẩu rồi liên kết Google trong **Cài đặt**. Hệ thống không tự ghép tài khoản chỉ dựa trên email.

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
| `pnpm decks:import <file> <email>` | Nạp bộ thẻ riêng cho một tài khoản (xem mục Bộ thẻ riêng) |
| `pnpm content:openjlpt` | Tải và làm sạch lại dữ liệu OpenJLPT vào `content/openjlpt/` |
| `pnpm content:vocab` | Dựng lại từ vựng và kanji vào `content/vocab/` (tải nguồn về `.cache/`, cần `unzip`, `tar`) |

## API chính

Mọi route có tiền tố `/api`. Đăng nhập bằng cookie httpOnly `goda_token` (hoặc header `Authorization: Bearer`).
Route không ghi chú là công khai — khách vẫn làm bài được.

| Method | Route | Mô tả |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/google`, `/auth/logout` | Đăng ký / đăng nhập email hoặc Google / đăng xuất |
| POST | `/auth/google/link` 🔒 | Liên kết Google với tài khoản đang đăng nhập |
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
| GET | `/dictionary` | Tổng số từ, kanji theo cấp |
| GET | `/dictionary/search?q=&level=&limit=` | Tra từ: chữ Nhật, romaji, tiếng Việt (có hoặc không dấu), âm Hán Việt, tiếng Anh |
| GET | `/dictionary/words/:id` | Chi tiết từ: nghĩa, ví dụ, phân tích kanji, từ đồng âm, trạng thái ôn tập |
| GET | `/dictionary/kanji?q=&level=`, `/dictionary/kanji/:char` | Danh sách / chi tiết kanji kèm từ chứa chữ đó |
| GET | `/vocab/levels`, `/vocab/levels/:level/lessons[/:no]` | Bài học từ vựng theo cấp (mỗi bài 20 từ) |
| GET | `/study/stats`, `/study/queue?limit=&level=` 🔒 | Thống kê và hàng từ đến hạn ôn, kèm lịch ôn dự kiến của 4 nút đánh giá |
| POST | `/study/review` 🔒 | Chấm một thẻ (1 Quên, 2 Khó, 3 Nhớ, 4 Dễ), tính lịch ôn bằng FSRS |
| GET/POST | `/study/words` 🔒 | Sổ từ: danh sách, thêm từ (`learned: true` khi vừa học xong bài) |
| PUT/DELETE | `/study/words/:id/known`, `/study/words/:id` 🔒 | Đánh dấu đã biết, xoá khỏi sổ |

Muốn có tài khoản admin: đổi cột `role` thành `ADMIN` trong bảng `users` (vd bằng pgAdmin).

## Cấu trúc

```
content/                 nội dung (JSON) — xem content/README.md
  goda/                  đề GODA biên soạn, mỗi file một đề
  openjlpt/              ngân hàng mở rộng (sinh bằng importer, không sửa tay)
  vocab/                 từ vựng, kanji, nghĩa tiếng Việt
scripts/
  seed.ts                nạp content/ và dựng đề thi
  openjlpt/              importer + làm sạch OpenJLPT (kana, kanji đồng âm)
  vocab/                 importer từ vựng + bộ lọc nghĩa OVDP
typeorm.config.ts        DataSource cho TypeORM CLI
src/
  database/              entity, enum, migration, naming strategy (snake_case)
  jlpt/                  domain: dạng bài, cấu trúc đề N5–N1, ước tính điểm, chọn câu
  common/                auth guard, decorator, tiện ích
  modules/               auth, users, catalog, exams, attempts, me, bookmarks, reports, health,
                         dictionary (tra từ), vocab (bài học, ôn tập FSRS)
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

## Deploy (Render + Neon, miễn phí)

API chạy trên Render (gói Free, Singapore) bằng `Dockerfile`; database là Neon (gói Free, 0,5 GB, không hết hạn).
Frontend trên Vercel gọi API qua proxy `/api/*` nên cookie đăng nhập vẫn là first-party.

1. **Neon** ([neon.com](https://neon.com)): project `goda-jlpt`, region *AWS Asia Pacific (Singapore)*. Thư mục này đã
   `neon link` (file `.neon`); lấy connection string về file riêng để không đè `.env` local:

   ```bash
   neon env pull --file .env.neon -e DATABASE_URL,DATABASE_URL_UNPOOLED
   ```

   Dùng **`DATABASE_URL_UNPOOLED`** (host không có `-pooler`) cho cả máy local lẫn Render, vì app tự chạy migration
   khi khởi động và Neon khuyên chạy migration qua kết nối trực tiếp. Đổi đuôi
   `channel_binding=require&sslmode=require` thành `sslmode=verify-full` để pg không in cảnh báo SSL.
2. **Nạp dữ liệu từ máy local** (Render free không có shell, mà image cũng không chứa `content/`):

   ```bash
   DATABASE_URL='postgresql://…neon.tech/neondb?sslmode=verify-full' pnpm migration:run
   DATABASE_URL='postgresql://…neon.tech/neondb?sslmode=verify-full' pnpm db:seed
   ```

   Biến truyền trên dòng lệnh được ưu tiên hơn `.env`. Khi sửa `content/`, chạy lại `db:seed` theo cách này.
3. **Render** ([render.com](https://render.com)): New → Blueprint → chọn repo này. Render đọc `render.yaml`, hỏi
   `DATABASE_URL` (dán chuỗi unpooled ở bước 1), tự sinh `JWT_SECRET`. API ở `https://goda-api.onrender.com/api`
   (tên có thể khác nếu đã bị dùng), kiểm tra bằng `/api/health`.
4. **Vercel**: đặt `API_INTERNAL_URL=https://<tên-service>.onrender.com/api` cho frontend rồi deploy lại.

Mỗi lần push lên `master`, Render tự build lại; migration mới tự áp khi app khởi động (`NODE_ENV=production`).

Gói Free của Render ngủ sau 15 phút không có request, lần gọi đầu tiên sau đó chờ khoảng 1 phút. Muốn giữ thức,
tạo job trên [cron-job.org](https://cron-job.org) gọi `https://<tên-service>.onrender.com/api/health/live` mỗi 10 phút.
Route này không chạm DB nên Neon vẫn tự ngủ (gói Free giới hạn 100 CU-giờ/tháng). 750 giờ/tháng của Render đủ cho một
service chạy liên tục.

## Bộ thẻ riêng

Bộ thẻ (`decks`, `deck_cards`) thuộc riêng một tài khoản, chỉ chủ tài khoản xem và ôn được (`/api/decks`, bắt buộc
đăng nhập). Nạp từ file JSON, tài khoản phải đăng ký trên web trước:

```bash
DATABASE_URL='…' pnpm decks:import <file.json> <email>
```

File có dạng `{ "decks": [{ "key", "course", "level", "chapter", "title", "kind": "vocab" | "kanji", "cards": [...] }] }`,
mỗi thẻ gồm `id`, `term`, `furigana` (`{漢字|かんじ}`), `reading`, `hanviet`, `wordType`, `meaning`,
`examples: [{ ja, vi }]` (xem `scripts/decks/import.ts`). Nạp lại thì cập nhật nội dung theo `key`/`id`, lịch ôn giữ
nguyên. File nguồn là nội dung riêng của người dùng: để trong `.cache/` (git bỏ qua), không commit.


### Hoạt động trong bộ thẻ

`GET /decks/:id` và `GET /decks/queue` trả thêm `speechText` ở mỗi thẻ và mỗi câu ví dụ. Từ dùng cách đọc và bỏ dấu ngoặc trong phần tùy chọn như `（する）`; câu ví dụ giữ nguyên chữ Hán, chỉ bỏ ký hiệu furigana để duy trì ngữ cảnh cho bộ đọc `ja-JP`; API không lưu file âm thanh.

`POST /decks/:id/practice` (yêu cầu đăng nhập):

```json
{
  "mode": "matching",
  "answers": [{ "cardId": "<UUID thẻ được hỏi>", "answerId": "<UUID thẻ có nghĩa được chọn>" }]
}
```

`mode` nhận `matching` hoặc `listening`. Nộp đúng một đáp án cho mỗi thẻ của bài (tối đa 2.000 thẻ); hai UUID đều phải thuộc bộ thẻ của người dùng. Các thẻ có cùng nghĩa được coi là tương đương. Kết quả `{ correct, total, completed, learned }` chỉ có `completed: true` khi tất cả đúng; khi đó những thẻ chưa học được đưa vào lịch FSRS và ghi nhật ký học như `POST /decks/:id/learned`. Chơi lại giữ lịch ôn hiện tại. Đây là xác nhận hoàn thành bài luyện, không phải điểm thi hay bảng xếp hạng.
