# ADR 0002 — Монорепо, стек и контракты типов

- **Статус:** принято
- **Дата:** 2026-06-12

## Контекст

Нужен общий код между витриной (Next.js), админкой (Vite SPA), API (Node) и будущими
мобильными клиентами; сквозная типобезопасность от БД до UI; быстрые сборки.

## Решение

1. **Монорепо** на npm workspaces + Turborepo. Внутренние пакеты подключаются как
   исходники (`exports` → `src/index.ts`), без шага пред‑сборки в dev (паттерн
   «internal packages»). Бандлеры (Next/Vite) и `tsx` резолвят TS‑исходники напрямую.
2. **Контракты — Zod в `packages/shared`** как единственный источник правды. DTO
   выводятся через `z.infer`; те же схемы валидируют вход API и формы клиента.
3. **TypeScript strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
   запрет `any` через ESLint `no-explicit-any`).
4. **ESLint type‑checked** (typescript-eslint) + Prettier; импорты упорядочены.
5. **Доступ к данным — repository pattern** в `packages/db`; сервисы не знают о Drizzle.

## Последствия

- Один тип «живёт» в одном месте; рассинхрон DTO между слоями невозможен.
- Type‑checked линт требует, чтобы каждый `.ts` попадал в tsconfig (через projectService).
- Composite project references не используем — резолв идёт через workspace‑симлинки.
