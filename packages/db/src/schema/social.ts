import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import { softDelete, timestamps } from './columns';
import { socialPostStatus } from './enums';
import { sellerProfiles, users } from './users';

/**
 * Соцсеть (B2B, аналог TenChat). Пост публикует обычный пользователь ИЛИ от лица
 * верифицированной компании (`sellerId`). Рекламные посты (`isAd`) создаёт админ —
 * у них нет автора-пользователя, зато есть рекламодатель и ссылка; они нативно
 * вставляются в ленту. Счётчики лайков/комментариев денормализованы для ленты.
 */
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Автор-пользователь (null у рекламных постов). */
    authorUserId: uuid('author_user_id').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    /** Если задан — пост опубликован от лица компании (магазина). */
    sellerId: uuid('seller_id').references((): AnyPgColumn => sellerProfiles.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    /** Ключи изображений в хранилище (раздаются прокси-роутом). */
    imageKeys: text('image_keys')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: socialPostStatus('status').notNull().default('published'),
    /** Рекламный пост (создаётся админом, вставляется в ленту). */
    isAd: boolean('is_ad').notNull().default(false),
    advertiser: text('advertiser'),
    adUrl: text('ad_url'),
    likeCount: integer('like_count').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  t => [
    index('posts_created_idx').on(t.createdAt),
    index('posts_status_idx').on(t.status),
    index('posts_author_idx').on(t.authorUserId),
    index('posts_seller_idx').on(t.sellerId),
    index('posts_is_ad_idx').on(t.isAd),
    check('posts_like_count_chk', sql`${t.likeCount} >= 0`),
    check('posts_comment_count_chk', sql`${t.commentCount} >= 0`),
  ]
);

export const postLikes = pgTable(
  'post_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    uniqueIndex('post_likes_post_user_uidx').on(t.postId, t.userId),
    index('post_likes_post_idx').on(t.postId),
    index('post_likes_user_idx').on(t.userId),
  ]
);

export const postComments = pgTable(
  'post_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    ...timestamps,
    ...softDelete,
  },
  t => [
    index('post_comments_post_idx').on(t.postId),
    index('post_comments_author_idx').on(t.authorUserId),
  ]
);
