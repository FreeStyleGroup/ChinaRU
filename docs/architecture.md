# Архитектура China-RU

> Скелет документа фазы R0. Диаграммы C4 (Context / Container / Component) и data‑flow
> наполняются по мере реализации фаз R1–R7.

## C1 — Контекст (кратко)

Пользователи: **покупатель**, **продавец**, **администратор/модератор**, мобильные
клиенты. Внешние системы: SMTP, OAuth (Google/Yandex/VK/WeChat), платёжный провайдер,
FCM/APNs, Meilisearch, Redis, SeaweedFS/S3.

## C2 — Контейнеры

| Контейнер     | Технология     | Ответственность                              |
| ------------- | -------------- | -------------------------------------------- |
| `apps/web`    | Next.js 15     | Витрина, SSR/ISR, SEO, корзина, кабинеты     |
| `apps/admin`  | React + Vite   | Админка, RBAC, модерация, аналитика          |
| `apps/api`    | Node + Express | REST `/api/v1`, auth, бизнес‑логика, OpenAPI |
| PostgreSQL 16 | —              | Хранилище (через Drizzle)                    |
| Redis         | —              | Кеш, rate‑limit, очереди                     |
| Meilisearch   | —              | Полнотекстовый поиск (ru/zh морфология)      |
| SeaweedFS/S3  | —              | Файлы и изображения                          |

## C3 — Слои API

```
routes → controllers → services → repositories → (Drizzle) → PostgreSQL
            │              │
         Zod parse     бизнес-логика (классы с DI)
```

- **Контроллеры** тонкие: `parse(Zod) → service → ApiResponse<T>`.
- **Сервисы** — классы, в конструктор инжектятся репозитории (тестируются моками).
- **Ошибки** — иерархия `AppError` (NotFound/Forbidden/Validation/Conflict) → errorHandler.

## Поток типов (single source of truth)

```
packages/shared (Zod schema)
        │ z.infer
        ├──→ apps/api  (валидация входа, типы ответов)
        ├──→ apps/web  (типы форм и данных)
        └──→ apps/admin
```

## Деплой

VPS + Docker Compose (prod), CI/CD через GitHub Actions. Детали — фаза R7.
