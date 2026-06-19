import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { products } from './catalog';
import { softDelete, timestamps } from './columns';
import { vehicleType } from './enums';
import { users } from './users';

/**
 * Авто-раздел: бренды китайского автопарка, их модели, официальные дилеры в России
 * (с координатами для карты), «Мой гараж» пользователя и таблица применимости
 * запчастей (product_fitments) — связь товара каталога с брендом/моделью.
 */

export const vehicleBrands = pgTable(
  'vehicle_brands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    nameZh: text('name_zh'),
    country: text('country').notNull().default('CN'),
    /** Покрываемые направления: подмножество vehicle_type (auto/moto/special). */
    types: text('types')
      .array()
      .notNull()
      .default(sql`'{auto}'::text[]`),
    logoUrl: text('logo_url'),
    popular: boolean('popular').notNull().default(false),
    sort: integer('sort').notNull().default(100),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('vehicle_brands_slug_uidx').on(t.slug),
    index('vehicle_brands_popular_idx').on(t.popular),
    index('vehicle_brands_sort_idx').on(t.sort),
  ]
);

export const vehicleModels = pgTable(
  'vehicle_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => vehicleBrands.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    type: vehicleType('type').notNull().default('auto'),
    bodyType: text('body_type'),
    yearFrom: integer('year_from'),
    yearTo: integer('year_to'),
    imageUrl: text('image_url'),
    sort: integer('sort').notNull().default(100),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('vehicle_models_brand_slug_uidx').on(t.brandId, t.slug),
    index('vehicle_models_brand_idx').on(t.brandId),
    index('vehicle_models_type_idx').on(t.type),
  ]
);

/** Официальный дилер (точка продаж) с координатами для карты. */
export const dealers = pgTable(
  'dealers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    city: text('city').notNull(),
    region: text('region'),
    address: text('address').notNull(),
    phone: text('phone'),
    website: text('website'),
    lat: numeric('lat', { precision: 9, scale: 6 }).notNull(),
    lng: numeric('lng', { precision: 9, scale: 6 }).notNull(),
    sort: integer('sort').notNull().default(100),
    ...timestamps,
    ...softDelete,
  },
  t => [index('dealers_city_idx').on(t.city)]
);

/** Какие бренды представляет дилер (м:м). */
export const dealerBrands = pgTable(
  'dealer_brands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealerId: uuid('dealer_id')
      .notNull()
      .references(() => dealers.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => vehicleBrands.id, { onDelete: 'cascade' }),
  },
  t => [
    uniqueIndex('dealer_brands_uidx').on(t.dealerId, t.brandId),
    index('dealer_brands_dealer_idx').on(t.dealerId),
    index('dealer_brands_brand_idx').on(t.brandId),
  ]
);

/** Транспорт пользователя («Мой гараж»). modelId опционален (свободный ввод модели). */
export const garageVehicles = pgTable(
  'garage_vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => vehicleBrands.id, { onDelete: 'restrict' }),
    modelId: uuid('model_id').references(() => vehicleModels.id, { onDelete: 'set null' }),
    /** Снимок названия модели (стабильно при удалении модели из справочника). */
    modelName: text('model_name').notNull(),
    type: vehicleType('type').notNull().default('auto'),
    year: integer('year'),
    vin: text('vin'),
    plate: text('plate'),
    ...timestamps,
  },
  t => [index('garage_vehicles_user_idx').on(t.userId)]
);

/**
 * Применимость запчасти: товар каталога подходит конкретной модели (`modelId`)
 * либо всем моделям бренда (`brandId` при `modelId IS NULL`). По выбранному в
 * гараже транспорту подбираем товары через эту таблицу.
 */
export const productFitments = pgTable(
  'product_fitments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => vehicleBrands.id, { onDelete: 'cascade' }),
    modelId: uuid('model_id').references(() => vehicleModels.id, { onDelete: 'cascade' }),
  },
  t => [
    index('product_fitments_product_idx').on(t.productId),
    index('product_fitments_brand_idx').on(t.brandId),
    index('product_fitments_model_idx').on(t.modelId),
  ]
);
