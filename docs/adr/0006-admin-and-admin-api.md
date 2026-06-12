# ADR 0006 — Админка и admin-API

- **Статус:** принято
- **Дата:** 2026-06-12

## Контекст

Нужна панель управления маркетплейсом (пользователи, продавцы, товары, заказы,
модерация отзывов, аналитика) — реально работающая end-to-end, а не макет.

## Решение

1. **Admin-API в `apps/api`** под `/api/v1/admin/*`, защищён `requireAuth` +
   `requireRole('admin')`. Новый домен (`AdminService`) переиспользует репозитории
   R1 и мапперы, вынесенные в общий `domain/dto.ts` (auth/catalog/orders теперь тоже
   берут мапперы оттуда — единый источник DTO).
2. **Доп. методы репозиториев (аддитивно):** пагинированные `list` для users/sellers/
   orders, `ReviewRepository` (с join автора), `AnalyticsRepository.summary()` для
   дашборда. Условия фильтра и `count` — из одного набора (как в R1).
3. **Контракты в `@china-ru/shared`:** `admin*ListQuery` + `AdminStats` (R2-стиль),
   переиспользуют существующие DTO (UserDto/ProductDto/OrderDto/SellerProfileDto/ReviewDto).
4. **SPA `apps/admin`** — React 19 + Vite + React Router 7 + TanStack Query, дизайн на
   общей `@china-ru/ui` (та же палитра, что и витрина). Гард `RequireAdmin` пускает
   только роль `admin`; список/мутации (верификация продавца, модерация отзыва) — через
   useQuery/useMutation с инвалидацией кеша.
5. **Тесты:** supertest+PGlite в API проверяют RBAC (403 не-админу, 401 гостю), статистику,
   списки, верификацию продавца и модерацию отзыва (24 теста API всего). SPA — чистые
   утилиты на Vitest; визуальный QA — Playwright MCP.

## Последствия

- `vite build` зелёный (≈115 kB gzip). Рефактор мапперов в `dto.ts` не изменил поведение
  R3 (все тесты прежние зелёные).
- Известная заметка аудита: 2 moderate — `postcss`, вшитый в Next.js (build-time, не
  рантайм API); ждёт обновления Next, `audit fix --force` ломает Next. Сам API — 0 уязвимостей.
