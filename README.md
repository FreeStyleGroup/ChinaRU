# China.ru

Международный B2B‑маркетплейс и портал по торговле с Китаем: каталог и заказы,
кабинеты покупателя/продавца/администратора, разделы Travel, Jobs, Metro, AI‑ассистент.

> **Статус:** ground‑up rewrite (фаза **R0 — фундамент**). Предыдущий MVP (на модели
> Haiku) архивирован в ветке `archive/haiku-mvp` и не является базой для правок.
> Полная спецификация и критерии приёмки — в [`REWRITE_SPEC.md`](./REWRITE_SPEC.md).

Цель — код инвест‑уровня, пригодный для технического due‑diligence и включения в
**Единый реестр российского ПО** (см. [`docs/registry-po.md`](./docs/registry-po.md)).

## Стек

| Слой      | Технология                                              |
| --------- | ------------------------------------------------------- |
| Web       | Next.js 15 (App Router) + React 19 — SSR/ISR, SEO       |
| Admin     | React 19 + Vite (SPA) + shadcn/ui — RBAC                |
| API       | Node 22 + Express + TypeScript (ESM)                    |
| БД        | PostgreSQL 16 + Drizzle ORM                             |
| Кеш/поиск | Redis · Meilisearch                                     |
| Файлы     | MinIO (S3‑совместимое)                                  |
| Контракты | Zod (single source of truth) → `z.infer` DTO            |
| Монорепо  | npm workspaces + Turborepo                              |
| Качество  | TypeScript strict · ESLint (type‑checked) · Vitest · CI |

## Структура

```
apps/
  web/     Next.js витрина (SSR/ISR/SEO)        — фаза R4
  admin/   Vite SPA админ‑панель (RBAC)         — фаза R5
  api/     Express REST API + OpenAPI           — фаза R3
packages/
  shared/  Zod‑схемы, DTO, константы, утилиты   — фаза R2
  db/      Drizzle schema, миграции, repos, seed — фаза R1
  ui/      Общие компоненты web + admin
docs/
  adr/     Architecture Decision Records
```

## Быстрый старт

```bash
nvm use            # Node 22 (см. .nvmrc)
npm install
cp .env.example .env

npm run check      # lint + typecheck + test (всё, что есть)
npm run dev        # turbo dev по всем приложениям (по мере появления)
```

## Скрипты

| Команда                 | Действие                         |
| ----------------------- | -------------------------------- |
| `npm run lint`          | ESLint (type‑checked, без `any`) |
| `npm run typecheck`     | `tsc` strict по всем воркспейсам |
| `npm run test`          | Vitest по всем воркспейсам       |
| `npm run test:coverage` | Тесты с покрытием                |
| `npm run format`        | Prettier (запись)                |
| `npm run check`         | lint + typecheck + test          |

## Критерии приёмки (hard gate)

См. раздел 0 в [`REWRITE_SPEC.md`](./REWRITE_SPEC.md): 0 ошибок typecheck (strict, без `any`),
0 warnings lint, покрытие ≥ 70 % на сервисном слое, SSR + JSON‑LD в `view-source`,
Lighthouse ≥ 90, валидный OpenAPI 3.1, отсутствие секретов в репозитории.

## Фазы

`R0` фундамент → `R1` db → `R2` shared → `R3` api → `R4` web → `R5` admin →
`R6` SEO/i18n/cache/security/observability → `R7` docs/deploy/staging.
