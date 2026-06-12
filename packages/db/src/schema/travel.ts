import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { softDelete, timestamps } from './columns';
import { bookingStatus, currency } from './enums';
import { users } from './users';

export const travelDestinations = pgTable(
  'travel_destinations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    nameRu: text('name_ru').notNull(),
    nameEn: text('name_en'),
    nameZh: text('name_zh'),
    description: text('description'),
    heroImage: text('hero_image'),
    climate: jsonb('climate').$type<Record<string, unknown>>(),
    ...timestamps,
    ...softDelete,
  },
  t => [uniqueIndex('travel_destinations_slug_uidx').on(t.slug)]
);

export const travelPackages = pgTable(
  'travel_packages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    destinationId: uuid('destination_id')
      .notNull()
      .references(() => travelDestinations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    currency: currency('currency').notNull().default('rub'),
    durationDays: integer('duration_days'),
    isPublished: boolean('is_published').notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  t => [
    index('travel_packages_destination_idx').on(t.destinationId),
    index('travel_packages_published_idx').on(t.isPublished),
  ]
);

export const travelBookings = pgTable(
  'travel_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    packageId: uuid('package_id')
      .notNull()
      .references(() => travelPackages.id, { onDelete: 'restrict' }),
    startDate: date('start_date'),
    endDate: date('end_date'),
    passengers: integer('passengers').notNull().default(1),
    status: bookingStatus('status').notNull().default('pending'),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
    currency: currency('currency').notNull().default('rub'),
    ...timestamps,
  },
  t => [
    index('travel_bookings_user_idx').on(t.userId),
    index('travel_bookings_package_idx').on(t.packageId),
    index('travel_bookings_status_idx').on(t.status),
  ]
);
