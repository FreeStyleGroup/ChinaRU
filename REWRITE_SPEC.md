# China-RU — Investor-Grade Ground-Up Rewrite Specification

> **Решение (2026-06-10):** Код Phases 1–5 писался на модели **Haiku 4.5** и содержит
> компиляционные ошибки, Drizzle anti-patterns, дыры в авторизации и client-only рендеринг.
> Латать его не будем. **Переписываем с нуля** под стандарт, который выдержит технический
> due diligence серьёзных инвесторов: чистая архитектура, тесты, типобезопасность end-to-end,
> SSR/SEO, observability, безопасность, CI/CD.
>
> Исполнять в свежей сессии на **Opus** (не Haiku). Стек: Next.js 15 + React 19 + Node 22 +
> Express/Fastify + PostgreSQL 16 + Drizzle. Монорепо: npm workspaces + Turborepo.
> Референс зрелых паттернов — `D:\Claude\FreeStyle\` (auth, middleware, AI-client, deploy).

---

## 0. Что значит «инвест-уровень» (acceptance bar)

Инвестор/технический аудитор проверит и должно быть ✅:

1. `npm run typecheck` — **0 ошибок**, strict TS, `noUncheckedIndexedAccess`, без единого `any`.
2. `npm run lint` — **0 warnings**, ESLint + Prettier + import-order настроены.
3. `npm run test` — unit + integration, **coverage ≥ 70%** на сервисном слое; e2e на критичных флоу.
4. `npm run build` — все apps собираются, нет рантайм-варнингов.
5. `view-source` карточки товара содержит **server-rendered HTML + JSON-LD Schema.org** (не пустой div).
6. Lighthouse ≥ 90 (Performance/SEO/Best Practices/Accessibility) на ключевых страницах.
7. OpenAPI 3.1 spec отдаётся на `/api/v1/openapi.json`, валиден, покрывает все эндпоинты.
8. Нет секретов в репо; `.env.example` полный; конфиг валидируется Zod при старте.
9. Все мутации — авторизованы и провалидированы; ownership-проверки на месте; rate-limit включён.
10. README с архитектурной диаграммой, ADR-ы (architecture decision records) в `docs/adr/`.

> Если хоть один пункт красный — продукт не готов к показу. Это hard gate.

---

## 1. Стратегия rewrite'а

**НЕ** редактировать существующие файлы Haiku. Подход:
1. Сохранить текущий `main` как `archive/haiku-mvp` (тег), чтобы история не терялась.
2. Переписывать пакет за пакетом снизу вверх: `db` → `shared` → `api` → `web` → `admin`.
3. Каждый слой закрывается тестами и зелёным typecheck до перехода к следующему.
4. Переносить из старого кода только то, что прошло ревью (большинство — переписать).
5. Из FreeStyle копировать проверенные паттерны (auth stack, error handler, axios-interceptor) — адаптировать, не слепо.

---

## 2. Целевая архитектура

```
china-ru/
├── apps/
│   ├── web/      Next.js 15 App Router. Server Components по умолчанию.
│   │            Client Components — только интерактив (формы, корзина).
│   │            SSR/ISR для каталога, SEO-метаданные, JSON-LD.
│   ├── admin/    React 19 + Vite SPA + shadcn/ui. Auth-guard, RBAC.
│   └── api/      Node 22 + Express. Слои: routes → controllers → services → repositories.
│                Zod-валидация на входе, OpenAPI на выходе, pino-логи, request-id.
├── packages/
│   ├── db/       Drizzle schema + migrations + seed. Repositories (НЕ сырые запросы в сервисах).
│   ├── shared/   Zod-схемы = единственный источник правды. DTO через z.infer. Constants, enums.
│   └── ui/       Общие компоненты web+admin (Card, Button, Badge, Form primitives).
├── docs/
│   ├── adr/      Architecture Decision Records (почему Drizzle, почему Next, и т.д.)
│   └── architecture.md  C4-диаграмма, data-flow, deployment.
└── .github/workflows/  ci.yml (lint+type+test) + deploy.yml (VPS).
```

### Принципы
- **Single source of truth для типов**: Zod-схема в `packages/shared` → `z.infer` даёт DTO →
  тот же тип использует api (валидация), web (формы), admin. Никаких ручных дублей интерфейсов.
- **Repository pattern**: весь доступ к БД — в `packages/db/repositories/*`. Сервисы оперируют
  репозиториями, не знают про Drizzle напрямую. Тестируется моками.
- **Service layer = бизнес-логика**, классы с DI (конструктор принимает репозитории).
- **Controllers тонкие**: parse(Zod) → service → respond(ApiResponse<T>). Без логики.
- **Errors типизированы**: иерархия `AppError` (NotFound/Forbidden/Validation/Conflict) → errorHandler мапит в HTTP + код.

---

## 3. Обязательно исправить (системные ошибки Haiku-кода как анти-чеклист)

При rewrite этих ошибок быть НЕ должно — проверять каждый сервис:

1. **Drizzle: повторные `.where()`** перетирают условие, а не AND-ят.
   → Собирать `conditions: SQL[]`, один `.where(and(...conditions))`.
2. **Count с пагинацией** должен применять ТЕ ЖЕ фильтры, что и выборка. Использовать `sql\`count(*)\``.
3. **`this` в объект-литералах** не биндится — отсюда классы для сервисов.
4. **Авторизация ролей**: каждая мутация seller/admin — через `requireRole`, не только `requireAuth`.
5. **Транзакции**: создание заказа со списанием остатков — `db.transaction()`.
6. **ESM**: никаких инлайновых `require(...)`. Только статические import сверху.
7. **Frontend client-fetch для SEO-страниц** — заменить на Server Components + server `fetch`.
8. **Несогласованность auth**: выбрать ОДНУ модель токенов (httpOnly-cookie для web).
   Не смешивать `localStorage.getItem('fs_access')` + `Authorization: Bearer` с cookie-сессией.
9. **Soft-delete** (`isNull(deletedAt)`) — консистентно во всех list-запросах.
10. **Индексы** на все FK в схеме (sellerId, categoryId, productId, orderId, destinationId, listingId).

---

## 4. Функциональный объём (фичи, которые должны работать)

Перенести/переписать из MVP:
- **Auth**: register → email verify → login → rotating refresh (httpOnly) → logout → forgot/reset.
  OAuth (Google/Yandex/VK/WeChat) — задизайнить, реализовать минимум Google+Yandex.
- **Каталог**: дерево категорий, листинг с фильтрами (цена/категория/бренд/рейтинг), SSR карточка товара, Meilisearch-поиск.
- **Корзина + checkout**: guest + auth, создание заказа в транзакции, статус-машина заказа.
- **Кабинеты**: buyer (заказы/избранное/профиль/документы), seller (товары CRUD + загрузка фото в MinIO + заказы + выплаты + аналитика + **вакансии**), admin (пользователи/товары/заказы/верификация продавцов/модерация отзывов/аналитика).
- **Reviews**: создание, модерация (pending→approved/rejected), вывод на карточке.
- **Travel**: destinations, packages, booking flow (SSR).
- **Jobs** (вакансии от компаний): seller постит из кабинета → публичный `/job/` с фильтром HSK; applications.
- **Metro**: справочник города/линии/станции (seed из Bitrix IBlock 26–29), SSG.
- **Чат покупатель↔продавец**: polling или WebSocket.
- **Уведомления**: email (nodemailer + react-email шаблоны) + push (FCM/APNs) — задел.
- **Mobile API**: `/api/v1/`, refresh TTL 90д для mobile, `POST /devices`, OpenAPI для генерации SDK.

---

## 5. Качество, без которого инвесторы не примут

- **Тесты**: Vitest. Unit на сервисы (моки репозиториев), integration на API (supertest + тестовая БД через testcontainers/docker), e2e на 2–3 ключевых флоу (Playwright): регистрация→логин, добавление товара продавцом→покупка.
- **Observability**: pino structured logs, request-id middleware, `/api/health` с проверками (db/redis/meili), Sentry-хук (задел).
- **Security**: helmet, CORS allowlist, rate-limit (глобальный + per-route), CSRF на form-мутациях, валидация ВСЕХ входов Zod, bcrypt cost ≥ 12, secure cookies, аудит-лог чувствительных действий.
- **SEO**: `generateMetadata`, JSON-LD (Product/BreadcrumbList/Organization/FAQ), Open Graph, canonical, динамический sitemap.xml, robots.txt.
- **i18n**: i18next ru/en/zh реально подключён, namespace разбит, zh для китайских продавцов.
- **Performance**: Redis-кеш (categories 24ч, карточки 15м, поиск 5м), ISR на каталоге, image optimization (next/image), индексы БД.
- **Docs**: `docs/architecture.md` (C4), `docs/adr/*` (ключевые решения), README с quick-start, OpenAPI → Swagger UI на `/api/v1/docs`.

---

## 6. Порядок исполнения (фазы rewrite'а)

| Фаза | Содержание | Gate |
|---|---|---|
| R0 | Тег `archive/haiku-mvp`. Базовая инфра: tsconfig strict, ESLint/Prettier, Vitest, turbo pipeline, CI скелет. | CI зелёный на пустых тестах |
| R1 | `packages/db`: финальная схема + индексы + миграции + repositories + seed. | db собирается, миграции применяются |
| R2 | `packages/shared`: Zod-схемы всех доменов → z.infer DTO, constants, enums. | typecheck зелёный |
| R3 | `apps/api`: config(Zod), middleware stack, errorHandler, auth (из FreeStyle), все домены (controllers→services→repos), OpenAPI, тесты. | coverage ≥70% сервисов, integration зелёные |
| R4 | `apps/web`: Server Components, SSR каталог/товар/travel/jobs, единый API-клиент, auth-context (cookie), формы, корзина, кабинеты. | Lighthouse ≥90, SSR HTML в view-source |
| R5 | `apps/admin`: Vite SPA, RBAC, таблицы, модерация, аналитика-дашборд. | auth-guard работает, e2e зелёные |
| R6 | SEO (JSON-LD/OG/sitemap), i18n ru/en/zh, Redis-кеш, rate-limit, security headers, observability. | acceptance bar (раздел 0) весь зелёный |
| R7 | Docs (architecture, ADR, README, Swagger), docker-compose prod, deploy.yml на VPS, staging. | деплой на staging работает |

После каждой фазы: `npm run typecheck && npm run lint && npm run test && npm run build`. Отдельный коммит на фазу.

---

## 7. Рекомендация по исполнению

Объём — это многонедельная работа уровня FreeStyle. Реалистично исполнять **по одной фазе R0–R7
на сессию** (или дробить крупные), на модели Opus, с коммитом-чекпоинтом в конце каждой.
Для широких параллельных задач (аудит всех сервисов, генерация тестов по всем доменам) —
имеет смысл многоагентный workflow, но запускать его только по явному запросу пользователя.

**HEAD на момент написания спеки: `df3e648`. Старый MVP-код — справочный, не база для правок.**
