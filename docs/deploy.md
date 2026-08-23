# Деплой China.ru

Стек контейнеризован: PostgreSQL, Redis, Meilisearch, MinIO, API (Node), Web
(Next.js standalone), Admin (статика за nginx) и пограничный nginx с TLS.

## Локальная разработка инфраструктуры

```bash
docker compose up -d           # postgres + redis + meilisearch + minio (dev)
cp .env.example .env           # заполнить DATABASE_URL и JWT-секреты
npm run dev                    # все приложения через Turborepo
```

Миграции: `npm run db:migrate -w @china-ru/db` (или применяются автоматически в
prod-образе API при старте).

## Production

Требуется Docker + домены из `WEB_HOST`, `API_HOST`, `ADMIN_HOST`,
указывающие на сервер. Основной china-ru.ru занят действующим сайтом,
поэтому экземпляр разворачивается на поддоменах app/api/admin, и выпущенные сертификаты Let's Encrypt в `/etc/letsencrypt`.

```bash
cp .env.prod.example .env.prod          # заполнить секреты (openssl rand -hex 32 для JWT)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Что внутри:

- **api** — миграции при старте (`docker-entrypoint.sh`), затем сервер на `:3001`
  (внутренний). Healthcheck `/api/health`.
- **web** — Next.js standalone на `:3000` (внутренний). `NEXT_PUBLIC_*` вшиваются на
  этапе сборки (build args).
- **admin** — собранный Vite-SPA за nginx (`:80`, внутренний).
- **nginx** — TLS на `80/443`, маршрутизация по доменам из .env.prod:
  `WEB_HOST`→web, `API_HOST`→api, `ADMIN_HOST`→admin. Конфиг nginx —
  шаблон, домены подставляются при старте контейнера. ACME-challenge через volume `certbot_webroot`.

### Первичный выпуск сертификата

```bash
docker run --rm -v /etc/letsencrypt:/etc/letsencrypt \
  -v china-ru_certbot_webroot:/var/www/certbot certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d app.china-ru.ru -d www.app.china-ru.ru -d api.china-ru.ru -d admin.china-ru.ru
```

## CI/CD

- `.github/workflows/ci.yml` — на каждый PR/пуш: format-check, lint, typecheck, тесты.
- `.github/workflows/deploy.yml` — на пуш в `main`: SSH на VPS, `git reset --hard`,
  `docker compose ... up -d --build`. Секреты репозитория: `DEPLOY_HOST`, `DEPLOY_USER`,
  `DEPLOY_SSH_KEY`, `DEPLOY_PATH`.

> Docker-сборки не запускаются в обычных гейтах (lint/typecheck/test) — проверять на
> Docker-хосте перед первым продакшн-деплоем.
