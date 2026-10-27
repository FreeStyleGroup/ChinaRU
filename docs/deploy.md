# Деплой China.ru

Стек контейнеризован: PostgreSQL, Redis, Meilisearch, SeaweedFS (S3), API (Node), Web
(Next.js standalone), Admin (статика за nginx) и пограничный nginx с TLS.

## Локальная разработка инфраструктуры

```bash
docker compose up -d           # postgres + redis + meilisearch + storage (dev)
cp .env.example .env           # заполнить DATABASE_URL и JWT-секреты
npm run dev                    # все приложения через Turborepo
```

Миграции: `npm run db:migrate -w @china-ru/db` (или применяются автоматически в
prod-образе API при старте).

## Production

Требуется Docker + домены из `WEB_HOST`, `API_HOST`, `ADMIN_HOST`,
указывающие на сервер. Основной china-ru.ru занят действующим сайтом,
поэтому экземпляр разворачивается на po.china-ru.ru (api и admin вложены в него), и выпущенные сертификаты Let's Encrypt в `/etc/letsencrypt`.

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
  -d po.china-ru.ru -d www.po.china-ru.ru -d api.po.china-ru.ru -d admin.po.china-ru.ru
```

## За nginx хостинга (тот же VPS, что и china-ru.ru)

> Пошаговая инструкция с проверками на каждом шаге, снимком VPS и откатом —
> [deploy-po-runbook.md](./deploy-po-runbook.md). Ниже — краткая выжимка.

На сервере с Битрикс-окружением порты 80/443 держит nginx хостинга, и наш
пограничный nginx туда не встанет. Для этого случая есть наложение
`docker-compose.proxy.yml`: контейнер nginx теряет TLS и наружные порты,
слушает только `127.0.0.1:8080`, а домены и сертификат обслуживает nginx
хостинга по конфигам `infra/host-nginx/`: `china-ru-acme.conf` (HTTP, ACME)
и `china-ru-app.conf` (HTTPS, ссылается на сертификат — включается после
его выпуска).

```bash
# 1. HTTP-часть: проверка ACME и переадресация на HTTPS.
mkdir -p /var/www/certbot
cp infra/host-nginx/china-ru-acme.conf /etc/nginx/bx/site_avaliable/
ln -s ../site_avaliable/china-ru-acme.conf /etc/nginx/bx/site_enabled/
nginx -t && systemctl reload nginx

# 2. Сертификат — на хосте, один на три домена (каталог назовётся по первому).
certbot certonly --webroot -w /var/www/certbot \
  -d po.china-ru.ru -d www.po.china-ru.ru -d api.po.china-ru.ru -d admin.po.china-ru.ru

# 3. HTTPS-часть.
cp infra/host-nginx/china-ru-app.conf /etc/nginx/bx/site_avaliable/
ln -s ../site_avaliable/china-ru-app.conf /etc/nginx/bx/site_enabled/
nginx -t && systemctl reload nginx

# 4. Стек — оба compose-файла, второй поверх первого; образы по одному.
compose="docker compose -f docker-compose.prod.yml -f docker-compose.proxy.yml --env-file .env.prod"
for service in api web admin; do $compose build "$service"; done
$compose up -d
```

В `.env.prod` при этом:

- `CERT_NAME` — любое значение: шаблону за прокси он не нужен, но базовый
  compose требует переменную при чтении файла;
- `TRUST_PROXY` выставляется наложением в `2` — прокси перед API теперь два.
  Оставить `1` значит получить у всех посетителей адрес nginx хостинга
  вместо их собственного, и rate-limit начнёт резать всех как одного.

Наложение требует Docker Compose ≥ 2.24 (тег `!override`). Проверить:
`docker compose version`.

## CI/CD

- `.github/workflows/ci.yml` — на каждый PR/пуш: format-check, lint, typecheck, тесты.
- `.github/workflows/deploy.yml` — **только ручной запуск** (Actions → Deploy → Run
  workflow): SSH на VPS, `git reset --hard`, проверка итога склейки с наложением,
  сборка образов по одному, `up -d`. Секреты репозитория: `DEPLOY_HOST`, `DEPLOY_USER`,
  `DEPLOY_SSH_KEY`, `DEPLOY_PATH`. На пуш в `main` не срабатывает: VPS общий с
  действующим сайтом, и время пересборки выбирает человек.

> Docker-сборки не запускаются в обычных гейтах (lint/typecheck/test) — проверять на
> Docker-хосте перед первым продакшн-деплоем.
