import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import { softDelete, timestamps } from './columns';
import { articleSection, articleStatus } from './enums';

/**
 * Контент-завод. На каждый тематический раздел — один ИИ-агент (`content_agents`),
 * который понимает только свою тему и пишет статьи (`articles`). Статьи проходят
 * модерацию (draft → published) и выводятся в блоке новостей внизу публичного раздела.
 */

export const contentAgents = pgTable(
  'content_agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Раздел, который ведёт агент. Один агент на раздел. */
    section: articleSection('section').notNull(),
    name: text('name').notNull(),
    /** Персона/системный промпт: жёстко задаёт тему и стиль агента. */
    persona: text('persona').notNull(),
    /** Имя модели у провайдера ИИ (null → дефолт провайдера). */
    model: text('model'),
    /** Затравки тем (JSON-массив строк). */
    topics: text('topics').array().notNull().default([]),
    enabled: boolean('enabled').notNull().default(true),
    ...timestamps,
  },
  t => [uniqueIndex('content_agents_section_uidx').on(t.section)]
);

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    section: articleSection('section').notNull(),
    /** Автор-агент (если статья сгенерирована ИИ); ручные статьи — null. */
    agentId: uuid('agent_id').references((): AnyPgColumn => contentAgents.id, {
      onDelete: 'set null',
    }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    body: text('body').notNull(),
    coverImageUrl: text('cover_image_url'),
    /** Промпт обложки (картинка прикрепляется при наличии хранилища). */
    imagePrompt: text('image_prompt'),
    status: articleStatus('status').notNull().default('draft'),
    /** 'ai' | 'manual'. */
    source: text('source'),
    authorName: text('author_name'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('articles_slug_uidx').on(t.slug),
    index('articles_section_idx').on(t.section),
    index('articles_status_idx').on(t.status),
    index('articles_published_idx').on(t.publishedAt),
  ]
);
