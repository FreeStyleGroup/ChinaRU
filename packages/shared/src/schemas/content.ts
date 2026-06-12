import { z } from 'zod';

import { idSchema, isoDateTime, slugSchema, timestampsShape } from '../common';
import { articleSectionSchema, articleStatusSchema, type ArticleSection } from '../enums';
import { paginationQuerySchema } from '../pagination';

/**
 * Контент-завод: ИИ-агенты пишут тематические статьи (по одному агенту на раздел),
 * статьи модерируются и выводятся в блоке новостей внизу соответствующего публичного
 * раздела. Провайдер ИИ абстрагирован на бэкенде (AITunnel/ГигаЧат/др.) — контракты
 * здесь от него не зависят.
 */

/* ───────────────── Справочники разделов (ru) ───────────────── */

export const ARTICLE_SECTION_LABELS: Record<ArticleSection, { ru: string }> = {
  horoscope: { ru: 'Гороскоп' },
  auto: { ru: 'Авто/Мото' },
  stocks: { ru: 'Акции Китая' },
  travel: { ru: 'Путешествия' },
  jobs: { ru: 'Работа' },
  tenders: { ru: 'Тендеры' },
  freight: { ru: 'Грузоперевозки' },
  education: { ru: 'Обучение' },
  metro: { ru: 'Метро' },
  general: { ru: 'Новости портала' },
};

export const ARTICLE_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликовано',
  archived: 'В архиве',
};

/**
 * Дефолтные персоны агентов по разделам — подставляются в редакторе «Контент-завода»,
 * когда агент ещё не создан (админу остаётся нажать «Создать»). Так у каждого раздела
 * сразу есть привязанный тематический агент.
 */
export const DEFAULT_CONTENT_AGENTS: Partial<
  Record<ArticleSection, { name: string; persona: string; topics: string[] }>
> = {
  horoscope: {
    name: 'Астролог',
    persona:
      'Ты — эксперт по китайскому гороскопу и восточной астрологии. Пишешь точные, увлекательные и достоверные статьи СТРОГО по теме китайского зодиака: знаки, стихии, совместимость (Сань Хэ, Лю Хэ, Лю Чун), годы и циклы, прогнозы. Тон — уверенный, дружелюбный, без эзотерического тумана и без обещаний «магии».',
    topics: [
      'Год Лошади 2026: что ждать и к чему готовиться',
      'Совместимость в браке: 5 пар китайского зодиака, которые работают',
      'Стихия Воды: характер и судьба людей-«водяных»',
      'Восточный календарь против западного: где правда',
      '60-летний цикл китайского зодиака: что значит «полный круг»',
      'Как считать свой знак: китайский Новый год и сдвиг даты',
      'Самые удачные и неудачные знаки 2026 года',
      'Китайский гороскоп для бизнеса: какие знаки — прирождённые предприниматели',
    ],
  },
  auto: {
    name: 'Эксперт по авто из Китая',
    persona:
      'Ты — автоэксперт по китайскому авторынку. Пишешь статьи СТРОГО про китайские автомобили: бренды, модели, надёжность, запчасти, пригон и обслуживание. Конкретно, по делу, с практическими советами.',
    topics: [
      'Топ-5 китайских кроссоверов 2026 года',
      'Как пригнать авто из Китая: пошаговый разбор',
      'Запчасти на китайские авто: где брать и на что смотреть',
    ],
  },
  stocks: {
    name: 'Аналитик рынка Китая',
    persona:
      'Ты — финансовый аналитик по китайскому фондовому рынку. Пишешь статьи СТРОГО про акции китайских компаний, индексы, ADR и тренды. Аккуратно, без инвест-советов «купи сейчас», с оговорками о рисках.',
    topics: [
      'Китайские техногиганты: на что смотреть инвестору',
      'Как устроены ADR китайских компаний',
      'Индексы материкового Китая и Гонконга: в чём разница',
    ],
  },
  travel: {
    name: 'Гид по Китаю',
    persona:
      'Ты — тревел-эксперт по Китаю. Пишешь статьи СТРОГО про путешествия в Китай: города, маршруты, виза, транспорт, культура, лайфхаки. Вдохновляюще и практично.',
    topics: [
      'Топ-5 направлений Китая 2026',
      'Виза в Китай: как оформить без посредников',
      'Что попробовать в китайской кухне: гид для новичка',
    ],
  },
};

/* ───────────────── ИИ-агент раздела ───────────────── */

export const contentAgentDtoSchema = z.object({
  id: idSchema,
  section: articleSectionSchema,
  name: z.string(),
  /** Персона/системный промпт: чётко задаёт тему и стиль — агент пишет только по ней. */
  persona: z.string(),
  /** Имя модели у провайдера (пусто → дефолт провайдера). */
  model: z.string().nullable(),
  /** Затравки тем для генерации (агент выбирает/развивает их). */
  topics: z.array(z.string()),
  enabled: z.boolean(),
  ...timestampsShape,
});
export type ContentAgentDto = z.infer<typeof contentAgentDtoSchema>;

/** Создание/обновление агента раздела (upsert по section). */
export const upsertContentAgentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  persona: z.string().trim().min(1).max(8000),
  model: z.string().trim().max(120).optional(),
  topics: z.array(z.string().trim().min(1).max(300)).max(200).default([]),
  enabled: z.boolean().default(true),
});
export type UpsertContentAgentInput = z.infer<typeof upsertContentAgentSchema>;

/** Запрос на генерацию статьи агентом (тема опциональна — иначе берётся из затравок). */
export const generateArticleSchema = z.object({
  topic: z.string().trim().min(1).max(300).optional(),
});
export type GenerateArticleInput = z.infer<typeof generateArticleSchema>;

/* ───────────────── Статья ───────────────── */

export const articleDtoSchema = z.object({
  id: idSchema,
  section: articleSectionSchema,
  agentId: idSchema.nullable(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  body: z.string(),
  coverImageUrl: z.string().nullable(),
  /** Промпт для генерации обложки (картинка добавляется при наличии хранилища). */
  imagePrompt: z.string().nullable(),
  status: articleStatusSchema,
  /** Источник: 'ai' (агент) или 'manual' (редактор). */
  source: z.string().nullable(),
  authorName: z.string().nullable(),
  publishedAt: isoDateTime.nullable(),
  ...timestampsShape,
});
export type ArticleDto = z.infer<typeof articleDtoSchema>;

/** Карточка для блока новостей/списка (без тела). */
export const articleCardDtoSchema = z.object({
  id: idSchema,
  section: articleSectionSchema,
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  authorName: z.string().nullable(),
  publishedAt: isoDateTime.nullable(),
});
export type ArticleCardDto = z.infer<typeof articleCardDtoSchema>;

/** Публичная статья (деталь) — карточка + тело. */
export const articlePublicDtoSchema = articleCardDtoSchema.extend({
  body: z.string(),
});
export type ArticlePublicDto = z.infer<typeof articlePublicDtoSchema>;

/* ───────────────── Ручное редактирование (админ) ───────────────── */

export const createArticleSchema = z.object({
  section: articleSectionSchema,
  title: z.string().trim().min(1).max(300),
  excerpt: z.string().trim().max(1000).optional(),
  body: z.string().trim().min(1).max(60000),
  coverImageUrl: z.url().max(2000).optional(),
  status: articleStatusSchema.optional(),
});
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    excerpt: z.string().trim().max(1000),
    body: z.string().trim().min(1).max(60000),
    coverImageUrl: z.url().max(2000),
    status: articleStatusSchema,
  })
  .partial();
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

/* ───────────────── Списки ───────────────── */

/** Админ-фильтр статей. */
export const articleListQuerySchema = paginationQuerySchema.extend({
  section: articleSectionSchema.optional(),
  status: articleStatusSchema.optional(),
});
export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;

/** Публичный запрос новостей раздела (для блока новостей и списка /articles). */
export const publicArticleQuerySchema = paginationQuerySchema.extend({
  section: articleSectionSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type PublicArticleQuery = z.infer<typeof publicArticleQuerySchema>;

/** Slug-параметр статьи в URL. */
export const articleSlugSchema = slugSchema;
