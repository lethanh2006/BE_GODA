import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Dùng process.env thay vì env() để `prisma generate` vẫn chạy khi chưa có DATABASE_URL (CI, postinstall).
    url: process.env.DATABASE_URL ?? '',
    // Chỉ cần khi chạy `prisma migrate dev` với `prisma dev` (dùng server shadow riêng của nó, cổng 51215).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
