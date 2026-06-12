import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { softDelete, timestamps } from './columns';
import { currency, productStatus, reviewStatus } from './enums';
import { sellerProfiles, users } from './users';

import type { AnyPgColumn } from 'drizzle-orm/pg-core';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    slug: text('slug').notNull(),
    nameRu: text('name_ru').notNull(),
    nameEn: text('name_en'),
    nameZh: text('name_zh'),
    depth: integer('depth').notNull().default(0),
    sort: integer('sort').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('categories_slug_uidx').on(t.slug),
    index('categories_parent_idx').on(t.parentId),
    index('categories_sort_idx').on(t.sort),
  ]
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    sku: text('sku').notNull(),
    nameRu: text('name_ru').notNull(),
    nameEn: text('name_en'),
    nameZh: text('name_zh'),
    descriptionRu: text('description_ru'),
    descriptionEn: text('description_en'),
    descriptionZh: text('description_zh'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    currency: currency('currency').notNull().default('rub'),
    stock: integer('stock').notNull().default(0),
    status: productStatus('status').notNull().default('draft'),
    rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('0'),
    reviewCount: integer('review_count').notNull().default(0),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('products_slug_uidx').on(t.slug),
    uniqueIndex('products_seller_sku_uidx').on(t.sellerId, t.sku),
    index('products_seller_idx').on(t.sellerId),
    index('products_category_idx').on(t.categoryId),
    index('products_status_idx').on(t.status),
    index('products_price_idx').on(t.price),
  ]
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    sort: integer('sort').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index('product_images_product_idx').on(t.productId)]
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    title: text('title'),
    body: text('body').notNull(),
    status: reviewStatus('status').notNull().default('pending'),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('reviews_product_author_uidx').on(t.productId, t.authorId),
    index('reviews_product_idx').on(t.productId),
    index('reviews_seller_idx').on(t.sellerId),
    index('reviews_author_idx').on(t.authorId),
    index('reviews_status_idx').on(t.status),
    check('reviews_rating_chk', sql`${t.rating} between 1 and 5`),
  ]
);
