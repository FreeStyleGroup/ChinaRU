# ════════════════════════════════════════════════════════════════
#  China-RU — Web (Next.js 15 standalone). Build context: репо-корень.
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
# NEXT_PUBLIC_* инлайнятся в бандл на этапе сборки.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_SITE_URL=https://china-ru.ru
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build --workspace=@china-ru/web

FROM node:22-alpine AS runner
RUN apk add --no-cache curl
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Standalone-вывод уже включает трейснутый node_modules и workspace-пакеты.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/ru || exit 1

EXPOSE 3000
USER node
CMD ["node", "apps/web/server.js"]
