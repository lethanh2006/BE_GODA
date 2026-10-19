import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // PrismaService được mock trong e2e, các giá trị này chỉ để qua bước validate env.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'e2e-test-secret-e2e-test-secret-1234',
    },
  },
});
