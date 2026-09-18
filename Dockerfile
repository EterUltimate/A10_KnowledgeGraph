# syntax=docker/dockerfile:1.7
# A10 知识图谱系统 · 生产镜像（Next.js 15 standalone 输出）
# 构建：docker build -t a10-kg:latest .
# 运行：docker run -p 3000:3000 --env-file .env a10-kg:latest
# 或使用 docker compose（含 Neo4j）：docker compose up -d

# ── Stage 1: deps ─────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# 仅复制依赖清单以最大化缓存命中
COPY package.json package-lock.json ./
# 若 lockfile 缺 @next/swc 等平台二进制，--omit=optional 可回避跨架构问题
RUN --mount=type=cache,target=/root/.npm npm ci --omit=optional

# ── Stage 2: builder ──────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 构建期占位值（应用运行时读取真实 .env；此处仅为通过 next build 的静态分析）
ARG NEO4J_URI=bolt://localhost:7687
ARG NEO4J_USER=neo4j
ARG NEO4J_PASSWORD=placeholder
ARG LLM_BASE_URL=https://api.deepseek.com/v1
ARG LLM_MODEL=deepseek-chat
ENV NEO4J_URI=$NEO4J_URI \
    NEO4J_USER=$NEO4J_USER \
    NEO4J_PASSWORD=$NEO4J_PASSWORD \
    LLM_BASE_URL=$LLM_BASE_URL \
    LLM_MODEL=$LLM_MODEL
RUN npm run build

# ── Stage 3: runner（最小化镜像，非 root）───────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data/store

# standalone 输出：Next 会打包运行时所需的最小 node_modules 与 .next/server
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# 若项目无 public 目录，上一行会失败；先创建空目录兜底
RUN mkdir -p public

# 数据目录（JSON 兜底/课程注册表/掌握状态/RAG 语料）——挂载卷可持久化
RUN mkdir -p /data/store && chown -R node:node /app /data
USER node
EXPOSE 3000

# 健康检查：命中 /api/health（A-3），失败 5 次视为 unhealthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/health | grep -q '"status":"ok"' || exit 1

CMD ["node", "server.js"]
