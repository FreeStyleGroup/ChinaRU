import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { softDelete, timestamps } from './columns';
import { currency, jobApplicationStatus, jobStatus, jobWorkType } from './enums';
import { sellerProfiles, users } from './users';

export const jobListings = pgTable(
  'job_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    currency: currency('currency').notNull().default('cny'),
    hskLevel: integer('hsk_level'),
    workType: jobWorkType('work_type').notNull(),
    city: text('city'),
    status: jobStatus('status').notNull().default('draft'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  t => [
    index('job_listings_seller_idx').on(t.sellerId),
    index('job_listings_status_idx').on(t.status),
    index('job_listings_work_type_idx').on(t.workType),
    index('job_listings_hsk_idx').on(t.hskLevel),
    check('job_listings_hsk_chk', sql`${t.hskLevel} is null or ${t.hskLevel} between 1 and 6`),
  ]
);

export const jobApplications = pgTable(
  'job_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => jobListings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    coverLetter: text('cover_letter'),
    status: jobApplicationStatus('status').notNull().default('submitted'),
    ...timestamps,
  },
  t => [
    uniqueIndex('job_applications_listing_user_uidx').on(t.listingId, t.userId),
    index('job_applications_listing_idx').on(t.listingId),
    index('job_applications_user_idx').on(t.userId),
  ]
);
