# Image production của API (Render, Koyeb hay VPS đều dùng được). Không chứa content/: seed chạy từ máy local.
FROM node:22-alpine AS base
RUN npm install -g pnpm@11.15.1
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build

FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# File kết quả AI tính sẵn (ví dụ từ liên quan), backend chỉ đọc: xem ai/README.md.
COPY assets ./assets
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
