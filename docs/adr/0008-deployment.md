# ADR 0008 — Деплой: Docker, nginx, CI/CD

- **Статус:** принято
- **Дата:** 2026-06-12

## Контекст

Финал ядра (R7): воспроизводимая контейнеризованная сборка и автоматический
деплой на VPS, по образцу FreeStyle.

## Решение

1. **Образы (multi-stage, контекст — корень монорепо):**
   - **api** — `npm ci` → `tsup` бандлит `server.js` + `migrate.js` (workspace-пакеты
     инлайнятся) → runner с прод-зависимостями. `docker-entrypoint.sh` гонит миграции
     (`migrate.js`, папка `packages/db/drizzle`), затем стартует сервер.
   - **web** — Next.js `output: 'standalone'` + `outputFileTracingRoot` на корень
     монорепо + `transpilePackages`; runner копирует `standalone` + `static` + `public`.
   - **admin** — Vite-сборка → статика за nginx (SPA-fallback).
2. **Топология prod (`docker-compose.prod.yml`):** postgres/redis/meilisearch/minio
   (внутренние), api (`:3001`), web (`:3000`), admin (`:80`) — все внутренние; пограничный
   **nginx** терминирует TLS на `80/443` и маршрутизирует по доменам
   (`china-ru.ru`→web, `api.`→api, `admin.`→admin). Секреты — из `.env.prod`.
3. **CI/CD:** `ci.yml` (format/lint/typecheck/test на PR) + `deploy.yml` (пуш в `main` →
   SSH на VPS → `git reset --hard` → `docker compose up -d --build`).
4. **Конфиг и безопасность:** `.dockerignore` исключает node_modules/.next/secrets;
   `.env.prod.example` — список секретов; cookie `secure=true`, домены из env.

## Последствия

- `npm run build` каждого приложения даёт деплоимый артефакт; standalone `server.js`
  ложится по пути, который ждёт Dockerfile (проверено сборкой).
- Docker-сборки не входят в обычные гейты (lint/typecheck/test) — верифицируются на
  Docker-хосте перед первым продакшн-деплоем (см. `docs/deploy.md`).
- Ядро China-RU (R0–R7) собрано. Дальнейшее — отдельные инициативы: поиск Meilisearch,
  чат, push, AI-ассистент.
