# ============================================================
# GH·WEB —— 容器镜像
#   零依赖：不需要 npm install，直接跑 server.js
#   docker build -t gh-web . && docker run -d -p 8787:8787 gh-web
# ============================================================
FROM node:22-alpine

LABEL org.opencontainers.image.title="GH·WEB" \
      org.opencontainers.image.description="GitHub 的高速只读镜像（静态站 + API 缓存代理）" \
      org.opencontainers.image.source="https://github.com/lszyk26/gh-web" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY web ./web

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787

EXPOSE 8787
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/healthz >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
