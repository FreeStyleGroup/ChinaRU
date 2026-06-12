# ════════════════════════════════════════════════════════════════
#  China-RU — Admin SPA (Vite → nginx). Build context: репо-корень.
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
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace=@china-ru/admin

FROM nginx:1.27-alpine AS runner
RUN apk add --no-cache curl
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY infra/nginx/admin.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost/ || exit 1
EXPOSE 80
