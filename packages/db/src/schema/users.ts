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
} from 'drizzle-orm/pg-core';

import { softDelete, timestamps } from './columns';
import {
  devicePlatform,
  localeEnum,
  oauthProvider,
  sellerVerifyStatus,
  userRole,
  userStatus,
} from './enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('buyer'),
    status: userStatus('status').notNull().default('pending_verify'),
    locale: localeEnum('locale').notNull().default('ru'),
    name: text('name'),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
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
    index('users_role_idx').on(t.role),
    index('users_status_idx').on(t.status),
  ]
);

export const sellerProfiles = pgTable(
  'seller_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyName: text('company_name').notNull(),
    companyNameZh: text('company_name_zh'),
    legalType: text('legal_type'),
    inn: text('inn'),
    description: text('description'),
    rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('0'),
    reviewCount: integer('review_count').notNull().default(0),
    verifyStatus: sellerVerifyStatus('verify_status').notNull().default('unverified'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  t => [
    uniqueIndex('seller_profiles_user_uidx').on(t.userId),
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
