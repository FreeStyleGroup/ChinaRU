# ════════════════════════════════════════════════════════════════
#  China-RU — API Dockerfile (multi-stage). Build context: репо-корень.
# ════════════════════════════════════════════════════════════════

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
# tsup бандлит server.js + migrate.js (workspace-пакеты инлайнятся).
RUN npm run build --workspace=@china-ru/api

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV MIGRATIONS_DIR=/app/packages/db/drizzle
WORKDIR /app

# Только прод-зависимости (api + db + остальные workspace-пакеты).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
RUN npm ci --omit=dev && npm cache clean --force

# Сборка + миграции.
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/db/drizzle packages/db/drizzle
COPY apps/api/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# wget — из busybox базового образа Alpine. Ставить curl ради проверки значит
# зависеть при сборке от зеркала пакетов Alpine, а оно доступно не отовсюду.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3001/api/health || exit 1

EXPOSE 3001
USER node
CMD ["/usr/local/bin/entrypoint.sh"]
