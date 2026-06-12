import { z } from 'zod';

import { LOCALES } from './locales';

/**
 * Канонические перечисления домена — ЕДИНЫЙ источник правды для всего портала.
 *
 * `packages/db` импортирует эти кортежи и строит из них `pgEnum`, поэтому значения
 * БД и значения Zod-валидации физически не могут разойтись (проверяется компилятором
 * и тестом синхронизации в db). Любое изменение enum начинается ЗДЕСЬ.
 */

export const USER_ROLES = ['buyer', 'seller', 'admin'] as const;
export const USER_STATUSES = ['active', 'banned', 'pending_verify'] as const;
export const CURRENCIES = ['rub', 'cny', 'usd', 'eur'] as const;
export const OAUTH_PROVIDERS = ['google', 'yandex', 'vk', 'wechat'] as const;
export const SELLER_VERIFY_STATUSES = ['unverified', 'pending', 'verified', 'rejected'] as const;
export const PRODUCT_STATUSES = ['draft', 'active', 'paused', 'banned'] as const;
export const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const JOB_WORK_TYPES = [
  'full_time',
  'part_time',
  'remote',
  'contract',
  'internship',
] as const;
export const JOB_STATUSES = ['draft', 'active', 'closed'] as const;
export const JOB_APPLICATION_STATUSES = ['submitted', 'reviewed', 'accepted', 'rejected'] as const;
/** Модерация пользовательского контента (резюме, вакансии): на проверке → опубликовано/отклонено. */
export const MODERATION_STATUSES = ['pending', 'published', 'rejected'] as const;
/** Опыт работы в резюме. */
export const RESUME_EXPERIENCES = [
  'none',
  'lt_1',
  '1_3',
  '3_6',
  'gt_6',
] as const;
/** Отрасли (сферы деятельности) для вакансий и резюме. */
export const JOB_CATEGORIES = [
  'it',
  'trade',
  'teaching',
  'marketing',
  'manufacturing',
  'logistics',
  'finance',
  'engineering',
  'translation',
  'management',
] as const;
export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export const NOTIFICATION_TYPES = ['order', 'review', 'chat', 'system'] as const;
export const DEVICE_PLATFORMS = ['ios', 'android'] as const;

export const localeSchema = z.enum(LOCALES);
export const userRoleSchema = z.enum(USER_ROLES);
export const userStatusSchema = z.enum(USER_STATUSES);
export const currencySchema = z.enum(CURRENCIES);
export const oauthProviderSchema = z.enum(OAUTH_PROVIDERS);
export const sellerVerifyStatusSchema = z.enum(SELLER_VERIFY_STATUSES);
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export const jobWorkTypeSchema = z.enum(JOB_WORK_TYPES);
export const jobStatusSchema = z.enum(JOB_STATUSES);
export const jobApplicationStatusSchema = z.enum(JOB_APPLICATION_STATUSES);
export const moderationStatusSchema = z.enum(MODERATION_STATUSES);
export const resumeExperienceSchema = z.enum(RESUME_EXPERIENCES);
export const jobCategorySchema = z.enum(JOB_CATEGORIES);
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export const devicePlatformSchema = z.enum(DEVICE_PLATFORMS);

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type OauthProvider = z.infer<typeof oauthProviderSchema>;
export type SellerVerifyStatus = z.infer<typeof sellerVerifyStatusSchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type JobWorkType = z.infer<typeof jobWorkTypeSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobApplicationStatus = z.infer<typeof jobApplicationStatusSchema>;
export type ModerationStatus = z.infer<typeof moderationStatusSchema>;
export type ResumeExperience = z.infer<typeof resumeExperienceSchema>;
export type JobCategory = z.infer<typeof jobCategorySchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;
