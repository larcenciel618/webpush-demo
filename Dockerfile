# syntax=docker/dockerfile:1.7
# Next.js App Router 用 マルチステージ Dockerfile (standalone 出力)
#
# NEXT_PUBLIC_* の環境変数は、Cloud Build の WriteEnv ステップで
# プロジェクトルートに生成された .env から npm run build が読み取り、
# クライアントバンドルに埋め込まれる。

# ---------- 1. 依存関係インストール ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- 2. ビルド ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 3. ランタイム ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0

# 非 root ユーザーで実行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone 出力: 必要な node_modules と server.js のみが入る最小構成
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 8080
CMD ["node", "server.js"]
