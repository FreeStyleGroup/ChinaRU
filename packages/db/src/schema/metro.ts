import { index, integer, numeric, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { timestamps } from './columns';

export const metroCities = pgTable(
  'metro_cities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    nameRu: text('name_ru').notNull(),
    nameZh: text('name_zh'),
    country: text('country'),
    sort: integer('sort').notNull().default(0),
    ...timestamps,
  },
  t => [uniqueIndex('metro_cities_slug_uidx').on(t.slug)]
);

export const metroLines = pgTable(
  'metro_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cityId: uuid('city_id')
      .notNull()
      .references(() => metroCities.id, { onDelete: 'cascade' }),
    nameRu: text('name_ru').notNull(),
    color: text('color'),
    lineNumber: text('line_number'),
    sort: integer('sort').notNull().default(0),
    ...timestamps,
  },
  t => [index('metro_lines_city_idx').on(t.cityId)]
);

export const metroStations = pgTable(
  'metro_stations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineId: uuid('line_id')
      .notNull()
      .references(() => metroLines.id, { onDelete: 'cascade' }),
    nameRu: text('name_ru').notNull(),
    nameZh: text('name_zh'),
    geoLat: numeric('geo_lat', { precision: 9, scale: 6 }),
    geoLon: numeric('geo_lon', { precision: 9, scale: 6 }),
    sort: integer('sort').notNull().default(0),
    ...timestamps,
  },
  t => [index('metro_stations_line_idx').on(t.lineId)]
);
