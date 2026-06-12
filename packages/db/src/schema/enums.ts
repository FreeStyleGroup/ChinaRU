import {
  BOOKING_STATUSES,
  CURRENCIES,
  DEVICE_PLATFORMS,
  JOB_APPLICATION_STATUSES,
  JOB_STATUSES,
  JOB_WORK_TYPES,
  JOB_CATEGORIES,
  LOCALES,
  MODERATION_STATUSES,
  NOTIFICATION_TYPES,
  OAUTH_PROVIDERS,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  RESUME_EXPERIENCES,
  REVIEW_STATUSES,
  SELLER_VERIFY_STATUSES,
  USER_ROLES,
  USER_STATUSES,
} from '@china-ru/shared';
import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * pgEnum строятся из канонических кортежей `@china-ru/shared`, поэтому значения БД
 * и значения Zod-валидации не могут разойтись (см. enums.sync.test.ts).
 */

export const userRole = pgEnum('user_role', USER_ROLES);
export const userStatus = pgEnum('user_status', USER_STATUSES);
export const localeEnum = pgEnum('locale', LOCALES);
export const currency = pgEnum('currency', CURRENCIES);
export const oauthProvider = pgEnum('oauth_provider', OAUTH_PROVIDERS);
export const sellerVerifyStatus = pgEnum('seller_verify_status', SELLER_VERIFY_STATUSES);
export const productStatus = pgEnum('product_status', PRODUCT_STATUSES);
export const orderStatus = pgEnum('order_status', ORDER_STATUSES);
export const reviewStatus = pgEnum('review_status', REVIEW_STATUSES);
export const jobWorkType = pgEnum('job_work_type', JOB_WORK_TYPES);
export const jobStatus = pgEnum('job_status', JOB_STATUSES);
export const jobApplicationStatus = pgEnum('job_application_status', JOB_APPLICATION_STATUSES);
export const moderationStatus = pgEnum('moderation_status', MODERATION_STATUSES);
export const resumeExperience = pgEnum('resume_experience', RESUME_EXPERIENCES);
export const jobCategory = pgEnum('job_category', JOB_CATEGORIES);
export const bookingStatus = pgEnum('booking_status', BOOKING_STATUSES);
export const notificationType = pgEnum('notification_type', NOTIFICATION_TYPES);
export const devicePlatform = pgEnum('device_platform', DEVICE_PLATFORMS);
