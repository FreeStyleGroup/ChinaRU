import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import { softDelete, timestamps } from './columns';
import {
  devicePlatform,
  localeEnum,
  oauthProvider,
  referralEvent,
  sellerVerifyStatus,
  userRole,
  userStatus,
} from './enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Числовой публичный ID (по умолчанию). Никнейм можно выбрать после верификации. */
    publicId: integer('public_id').generatedByDefaultAsIdentity({ startWith: 100001 }).notNull(),
    /** Выбранный никнейм; доступен только верифицированному пользователю. */
    nickname: text('nickname'),
    email: text('email').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    /** Верификация профиля («синяя галочка»); разблокирует выбор никнейма. */
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('buyer'),
    status: userStatus('status').notNull().default('pending_verify'),
    locale: localeEnum('locale').notNull().default('ru'),
    name: text('name'),
    lastName: text('last_name'),
    phone: text('phone'),
    /** Дата рождения в формате YYYY-MM-DD; используется разделом «Гороскоп». */
    birthday: text('birthday'),
    avatarUrl: text('avatar_url'),
    /** Кто пригласил (реферальная программа MLM). */
    referredBy: uuid('referred_by').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    /** Баллы лояльности (в т.ч. реферальные). */
    points: integer('points').notNull().default(0),
    /** Реферальный доход (₽), тратится на портале. */
    referralBalance: numeric('referral_balance', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    /**
     * Согласие на обработку персональных данных: когда дано и на какой документ
     * (адрес опубликованного текста). Пусто — учётная запись создана до того,
     * как регистрация стала требовать согласие.
     */
    pdConsentAt: timestamp('pd_consent_at', { withTimezone: true }),
    pdConsentDoc: text('pd_consent_doc'),
    /** Включённые опциональные разделы кабинета (ключи из CABINET_SECTIONS). */
    menuSections: text('menu_sections')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('users_email_uidx').on(t.email),
    uniqueIndex('users_public_id_uidx').on(t.publicId),
    uniqueIndex('users_nickname_uidx').on(t.nickname),
    index('users_role_idx').on(t.role),
    index('users_status_idx').on(t.status),
    index('users_referred_by_idx').on(t.referredBy),
  ]
);

/**
 * Леджер реферальных начислений (MLM). Каждая запись — вознаграждение `beneficiary`
 * за событие `source` на определённом уровне (1–3): деньги (₽) и/или баллы.
 */
export const referralEarnings = pgTable(
  'referral_earnings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    beneficiaryId: uuid('beneficiary_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    level: integer('level').notNull(),
    event: referralEvent('event').notNull(),
    orderId: uuid('order_id'),
    money: numeric('money', { precision: 14, scale: 2 }).notNull().default('0'),
    points: integer('points').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index('referral_earnings_beneficiary_idx').on(t.beneficiaryId),
    index('referral_earnings_source_idx').on(t.sourceId),
  ]
);

export const sellerProfiles = pgTable(
  'seller_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Числовой публичный ID магазина (по умолчанию). Никнейм — после верификации. */
    publicId: integer('public_id').generatedByDefaultAsIdentity({ startWith: 100001 }).notNull(),
    /** Никнейм магазина; доступен после верификации (verifyStatus = verified). */
    nickname: text('nickname'),
    companyName: text('company_name').notNull(),
    companyNameZh: text('company_name_zh'),
    legalType: text('legal_type'),
    inn: text('inn'),
    /** Контакты заявки (видны модератору). */
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    description: text('description'),
    /** Оформление публичной страницы магазина: баннер и логотип (адреса файлов в хранилище). */
    bannerUrl: text('banner_url'),
    logoUrl: text('logo_url'),
    rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('0'),
    reviewCount: integer('review_count').notNull().default(0),
    verifyStatus: sellerVerifyStatus('verify_status').notNull().default('unverified'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('seller_profiles_user_uidx').on(t.userId),
    uniqueIndex('seller_profiles_public_id_uidx').on(t.publicId),
    uniqueIndex('seller_profiles_nickname_uidx').on(t.nickname),
    index('seller_profiles_verify_idx').on(t.verifyStatus),
  ]
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedById: uuid('replaced_by_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    uniqueIndex('refresh_tokens_hash_uidx').on(t.tokenHash),
    index('refresh_tokens_user_idx').on(t.userId),
    index('refresh_tokens_expires_idx').on(t.expiresAt),
  ]
);

export const emailVerifications = pgTable(
  'email_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    uniqueIndex('email_verifications_hash_uidx').on(t.tokenHash),
    index('email_verifications_user_idx').on(t.userId),
  ]
);

export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    uniqueIndex('password_resets_hash_uidx').on(t.tokenHash),
    index('password_resets_user_idx').on(t.userId),
  ]
);

export const socialAccounts = pgTable(
  'social_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProvider('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    uniqueIndex('social_accounts_provider_uidx').on(t.provider, t.providerUserId),
    index('social_accounts_user_idx').on(t.userId),
  ]
);

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: devicePlatform('platform').notNull(),
    token: text('token').notNull(),
    ...timestamps,
  },
  t => [uniqueIndex('devices_token_uidx').on(t.token), index('devices_user_idx').on(t.userId)]
);
