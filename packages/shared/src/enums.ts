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
/** Тип прикреплённого к резюме документа (подтверждённые повышают рейтинг соискателя). */
export const RESUME_DOCUMENT_TYPES = [
  'diploma',
  'certificate',
  'hsk_certificate',
  'reference',
  'other',
] as const;
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
/** Статус поста соцсети: опубликован → скрыт модератором. */
export const SOCIAL_POST_STATUSES = ['published', 'hidden'] as const;
export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export const NOTIFICATION_TYPES = [
  'order',
  'review',
  'chat',
  'system',
  'mention',
  'follow',
  'report',
  'tender',
] as const;
/** Объект жалобы и статус её рассмотрения модератором. */
export const REPORT_TARGET_TYPES = ['post', 'user'] as const;
export const REPORT_STATUSES = ['pending', 'resolved', 'dismissed'] as const;
export const DEVICE_PLATFORMS = ['ios', 'android'] as const;
/** Событие реферального начисления (MLM). */
export const REFERRAL_EVENTS = ['order', 'subscription', 'first_deal'] as const;
/**
 * Тематические разделы контента. У каждого большого публичного раздела свой блок
 * новостей внизу и свой ИИ-агент «Контент завода», который пишет статьи только по
 * этой теме. Любое добавление раздела начинается ЗДЕСЬ.
 */
export const ARTICLE_SECTIONS = [
  'horoscope',
  'auto',
  'stocks',
  'travel',
  'jobs',
  'tenders',
  'freight',
  'education',
  'metro',
  'general',
] as const;
/** Статус статьи: черновик (сгенерирован ИИ/создан) → опубликован → в архиве. */
export const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;

/**
 * Тендерная площадка (B2B-закупки между верифицированными компаниями).
 * Способы проведения смоделированы по 44-ФЗ/223-ФЗ; для частной площадки правовой
 * режим — справочный признак (`commercial` по умолчанию, `fz44`/`fz223` — если заказчик
 * является госзаказчиком и ссылается на регламент).
 */
export const TENDER_METHODS = [
  'open_tender', // открытый конкурс — выбор по совокупности критериев
  'auction', // электронный аукцион — выбор по наименьшей цене
  'request_quotations', // запрос котировок — малые закупки по цене
  'request_proposals', // запрос предложений
  'single_source', // закупка у единственного поставщика
] as const;
export const TENDER_LAWS = ['fz44', 'fz223', 'commercial'] as const;
/** Жизненный цикл тендера: черновик → опубликован (приём заявок) → рассмотрение → итоги/отмена/завершён. */
export const TENDER_STATUSES = [
  'draft',
  'published',
  'review',
  'awarded',
  'cancelled',
  'completed',
] as const;
/** Статус заявки участника: подана → допущена/отклонена → победитель/проигравшая/отозвана. */
export const TENDER_BID_STATUSES = [
  'submitted',
  'admitted',
  'rejected',
  'won',
  'lost',
  'withdrawn',
] as const;

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
export const resumeDocumentTypeSchema = z.enum(RESUME_DOCUMENT_TYPES);
export const jobCategorySchema = z.enum(JOB_CATEGORIES);
export const socialPostStatusSchema = z.enum(SOCIAL_POST_STATUSES);
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export const reportTargetTypeSchema = z.enum(REPORT_TARGET_TYPES);
export const reportStatusSchema = z.enum(REPORT_STATUSES);
export const devicePlatformSchema = z.enum(DEVICE_PLATFORMS);
export const referralEventSchema = z.enum(REFERRAL_EVENTS);
export const articleSectionSchema = z.enum(ARTICLE_SECTIONS);
export const articleStatusSchema = z.enum(ARTICLE_STATUSES);
export const tenderMethodSchema = z.enum(TENDER_METHODS);
export const tenderLawSchema = z.enum(TENDER_LAWS);
export const tenderStatusSchema = z.enum(TENDER_STATUSES);
export const tenderBidStatusSchema = z.enum(TENDER_BID_STATUSES);

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
export type ResumeDocumentType = z.infer<typeof resumeDocumentTypeSchema>;
export type JobCategory = z.infer<typeof jobCategorySchema>;
export type SocialPostStatus = z.infer<typeof socialPostStatusSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;
export type ReferralEvent = z.infer<typeof referralEventSchema>;
export type ArticleSection = z.infer<typeof articleSectionSchema>;
export type ArticleStatus = z.infer<typeof articleStatusSchema>;
export type TenderMethod = z.infer<typeof tenderMethodSchema>;
export type TenderLaw = z.infer<typeof tenderLawSchema>;
export type TenderStatus = z.infer<typeof tenderStatusSchema>;
export type TenderBidStatus = z.infer<typeof tenderBidStatusSchema>;

/** Доли вознаграждения по уровням реферальной сети (MLM): 1 → 10%, 2 → 5%, 3 → 2%. */
export const REFERRAL_LEVEL_RATES = [0.1, 0.05, 0.02] as const;
/** Баллы лояльности за уровни (на каждые 100 ₽ оборота реферала). */
export const REFERRAL_LEVEL_POINTS = [10, 3, 1] as const;
/** Разовый бонус (баллы) пригласившему за первую сделку реферала. */
export const REFERRAL_FIRST_DEAL_BONUS = 500;
