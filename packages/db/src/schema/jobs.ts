import { sql } from 'drizzle-orm';
import {
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
import {
  currency,
  jobApplicationStatus,
  jobCategory,
  jobStatus,
  jobWorkType,
  moderationStatus,
  resumeDocumentType,
  resumeExperience,
} from './enums';
import { sellerProfiles, users } from './users';

/**
 * Резюме соискателя. Одно на пользователя. Проходит модерацию: pending → published
 * (видно работодателям и в разделе «Вакансии»/базе резюме) либо rejected с причиной.
 */
export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    position: text('position').notNull(),
    /** Желаемая сфера деятельности. */
    category: jobCategory('category'),
    salary: text('salary'),
    experience: resumeExperience('experience'),
    skills: text('skills'),
    about: text('about'),
    /** Подтверждённый уровень HSK (сертификат школы повышает рейтинг). */
    hskLevel: integer('hsk_level'),
    /** Рейтинг соискателя (растёт за подтверждённые документы/сертификаты). */
    rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('0'),
    reviewCount: integer('review_count').notNull().default(0),
    moderationStatus: moderationStatus('moderation_status').notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('resumes_user_uidx').on(t.userId),
    index('resumes_moderation_idx').on(t.moderationStatus),
    index('resumes_category_idx').on(t.category),
    check('resumes_hsk_chk', sql`${t.hskLevel} is null or ${t.hskLevel} between 1 and 6`),
  ]
);

/**
 * Документы, прикреплённые к резюме (диплом, сертификат, подтверждение HSK школы).
 * Подтверждённые модератором (`verifiedAt`) повышают рейтинг соискателя. Сам файл
 * лежит в объектном хранилище под ключом `fileKey`; здесь — только метаданные.
 */
export const resumeDocuments = pgTable(
  'resume_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    type: resumeDocumentType('type').notNull().default('other'),
    fileKey: text('file_key').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    /** Подтверждён модератором — учитывается в рейтинге соискателя. */
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    ...timestamps,
  },
  t => [
    index('resume_documents_resume_idx').on(t.resumeId),
    check('resume_documents_size_chk', sql`${t.sizeBytes} >= 0`),
  ]
);

export const jobListings = pgTable(
  'job_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** Сфера деятельности вакансии (категория). */
    category: jobCategory('category'),
    description: text('description').notNull(),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    currency: currency('currency').notNull().default('cny'),
    hskLevel: integer('hsk_level'),
    workType: jobWorkType('work_type').notNull(),
    city: text('city'),
    status: jobStatus('status').notNull().default('draft'),
    /** Модерация вакансии: pending → published (видно в «Вакансии») / rejected. */
    moderationStatus: moderationStatus('moderation_status').notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  t => [
    index('job_listings_seller_idx').on(t.sellerId),
    index('job_listings_status_idx').on(t.status),
    index('job_listings_moderation_idx').on(t.moderationStatus),
    index('job_listings_category_idx').on(t.category),
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
