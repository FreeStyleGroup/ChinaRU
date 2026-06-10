import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  foreignKey,
  primaryKey,
  numeric,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// ============ ENUMS ============

export const userRoleEnum = pgEnum('user_role', ['buyer', 'seller', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'banned', 'pending_verify']);
export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'yandex', 'vk', 'wechat']);
export const localeEnum = pgEnum('locale', ['ru', 'en', 'zh']);
export const currencyEnum = pgEnum('currency', ['rub', 'cny', 'usd', 'eur']);
export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'active',
  'paused',
  'banned',
]);
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);
export const jobTypeEnum = pgEnum('job_type', [
  'full_time',
  'part_time',
  'contract',
  'freelance',
  'internship',
]);
export const hskLevelEnum = pgEnum('hsk_level', ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const sellerTierEnum = pgEnum('seller_tier', ['bronze', 'silver', 'gold', 'platinum']);

// ============ AUTH TABLES ============

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailNormalized: varchar('email_normalized', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    name: varchar('name', { length: 255 }).notNull(),
    avatar: varchar('avatar', { length: 512 }),
    role: userRoleEnum('role').default('buyer').notNull(),
    status: userStatusEnum('status').default('pending_verify').notNull(),
    locale: localeEnum('locale').default('ru').notNull(),
    timezone: varchar('timezone', { length: 64 }).default('Europe/Moscow'),
    preferredCurrency: currencyEnum('preferred_currency').default('rub').notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }),
    kycStatus: varchar('kyc_status', { length: 50 }).default('pending'),
    kycVerifiedAt: timestamp('kyc_verified_at'),
    loginCount: integer('login_count').default(0),
    lastLoginAt: timestamp('last_login_at'),
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    preferences: jsonb('preferences').$type<Record<string, any>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  table => [
    uniqueIndex('idx_users_email_normalized').on(table.emailNormalized),
    index('idx_users_role').on(table.role),
    index('idx_users_status').on(table.status),
    index('idx_users_created_at').on(table.createdAt),
  ]
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    userAgent: text('user_agent'),
    ip: varchar('ip', { length: 45 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedById: uuid('replaced_by_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_refresh_tokens_user_id').on(table.userId),
    index('idx_refresh_tokens_expires_at').on(table.expiresAt),
  ]
);

export const emailVerifications = pgTable(
  'email_verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [index('idx_email_verifications_user_id').on(table.userId)]
);

export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [index('idx_password_resets_user_id').on(table.userId)]
);

export const socialAccounts = pgTable(
  'social_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProviderEnum('provider').notNull(),
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    name: varchar('name', { length: 255 }),
    avatar: varchar('avatar', { length: 512 }),
    rawData: jsonb('raw_data').$type<Record<string, any>>(),
    linkedAt: timestamp('linked_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    uniqueIndex('idx_social_accounts_provider_user').on(table.provider, table.providerUserId),
    index('idx_social_accounts_user_id').on(table.userId),
  ]
);

// ============ SELLER TABLES ============

export const sellerProfiles = pgTable(
  'seller_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    companyNameCN: varchar('company_name_cn', { length: 255 }),
    legalType: varchar('legal_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).default('pending_verification').notNull(),
    tier: sellerTierEnum('tier').default('bronze').notNull(),
    logo: varchar('logo', { length: 512 }),
    description: text('description'),
    address: jsonb('address').$type<{
      country: string;
      city: string;
      street: string;
      postalCode?: string;
    }>(),
    phone: varchar('phone', { length: 20 }).notNull(),
    website: varchar('website', { length: 512 }),
    rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
    reviewCount: integer('review_count').default(0),
    productCount: integer('product_count').default(0),
    totalSales: integer('total_sales').default(0),
    totalRevenue: numeric('total_revenue', { precision: 16, scale: 2 }).default('0'),
    currency: currencyEnum('currency').default('rub').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_seller_profiles_status').on(table.status),
    index('idx_seller_profiles_tier').on(table.tier),
    index('idx_seller_profiles_rating').on(table.rating),
  ]
);

// ============ CATALOG TABLES ============

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id').references(() => categories.id, { onDelete: 'set null' }),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    nameRu: varchar('name_ru', { length: 255 }).notNull(),
    nameEn: varchar('name_en', { length: 255 }).notNull(),
    nameZh: varchar('name_zh', { length: 255 }).notNull(),
    descriptionRu: text('description_ru'),
    descriptionEn: text('description_en'),
    descriptionZh: text('description_zh'),
    imageUrl: varchar('image_url', { length: 512 }),
    depth: integer('depth').default(0).notNull(),
    sort: integer('sort').default(0).notNull(),
    productCount: integer('product_count').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_categories_parent_id').on(table.parentId),
    index('idx_categories_slug').on(table.slug),
    index('idx_categories_sort').on(table.sort),
  ]
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    sku: varchar('sku', { length: 255 }).notNull(),
    nameRu: varchar('name_ru', { length: 255 }).notNull(),
    nameEn: varchar('name_en', { length: 255 }).notNull(),
    nameZh: varchar('name_zh', { length: 255 }).notNull(),
    descriptionRu: text('description_ru'),
    descriptionEn: text('description_en'),
    descriptionZh: text('description_zh'),
    status: productStatusEnum('status').default('draft').notNull(),
    price: numeric('price', { precision: 16, scale: 2 }).notNull(),
    currency: currencyEnum('currency').default('rub').notNull(),
    stock: integer('stock').default(0).notNull(),
    rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
    reviewCount: integer('review_count').default(0),
    tags: jsonb('tags').$type<string[]>().default(sql`'[]'`),
    attributes: jsonb('attributes').$type<Record<string, string>>(),
    weight: numeric('weight', { precision: 10, scale: 2 }),
    dimensions: jsonb('dimensions').$type<{
      length: number;
      width: number;
      height: number;
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  table => [
    index('idx_products_seller_id').on(table.sellerId),
    index('idx_products_category_id').on(table.categoryId),
    index('idx_products_slug').on(table.slug),
    index('idx_products_status').on(table.status),
    index('idx_products_rating').on(table.rating),
    index('idx_products_created_at').on(table.createdAt),
  ]
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 512 }).notNull(),
    sort: integer('sort').default(0),
    isPrimary: boolean('is_primary').default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_product_images_product_id').on(table.productId),
    index('idx_product_images_is_primary').on(table.isPrimary),
  ]
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 255 }).notNull(),
    attributes: jsonb('attributes').$type<Record<string, string>>().notNull(),
    price: numeric('price', { precision: 16, scale: 2 }).notNull(),
    stock: integer('stock').notNull(),
    weight: numeric('weight', { precision: 10, scale: 2 }),
    dimensions: jsonb('dimensions').$type<{
      length: number;
      width: number;
      height: number;
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_product_variants_product_id').on(table.productId),
    uniqueIndex('idx_product_variants_sku').on(table.sku),
  ]
);

// ============ ORDER TABLES ============

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    publicId: varchar('public_id', { length: 50 }).notNull().unique(),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: orderStatusEnum('status').default('pending').notNull(),
    subtotal: numeric('subtotal', { precision: 16, scale: 2 }).notNull(),
    shippingCost: numeric('shipping_cost', { precision: 16, scale: 2 }).default('0'),
    tax: numeric('tax', { precision: 16, scale: 2 }).default('0'),
    totalAmount: numeric('total_amount', { precision: 16, scale: 2 }).notNull(),
    currency: currencyEnum('currency').default('rub').notNull(),
    shippingAddress: jsonb('shipping_address').$type<{
      country: string;
      city: string;
      street: string;
      postalCode?: string;
    }>().notNull(),
    trackingNumber: varchar('tracking_number', { length: 255 }),
    paymentMethod: varchar('payment_method', { length: 100 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_orders_buyer_id').on(table.buyerId),
    index('idx_orders_status').on(table.status),
    index('idx_orders_created_at').on(table.createdAt),
    uniqueIndex('idx_orders_public_id').on(table.publicId),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull(),
    price: numeric('price', { precision: 16, scale: 2 }).notNull(),
    currency: currencyEnum('currency').default('rub').notNull(),
  },
  table => [index('idx_order_items_order_id').on(table.orderId)]
);

// ============ REVIEW TABLES ============

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    title: varchar('title', { length: 255 }),
    text: text('text'),
    status: varchar('status', { length: 50 }).default('pending').notNull(),
    images: jsonb('images').$type<string[]>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_reviews_product_id').on(table.productId),
    index('idx_reviews_seller_id').on(table.sellerId),
    index('idx_reviews_author_id').on(table.authorId),
    index('idx_reviews_status').on(table.status),
  ]
);

// ============ CHAT TABLES ============

export const chats = pgTable(
  'chats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    uniqueIndex('idx_chats_buyer_seller_product').on(table.buyerId, table.sellerId, table.productId),
    index('idx_chats_buyer_id').on(table.buyerId),
    index('idx_chats_seller_id').on(table.sellerId),
  ]
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    attachments: jsonb('attachments').$type<
      { url: string; type: string; size: number }[]
    >(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_messages_chat_id').on(table.chatId),
    index('idx_messages_sender_id').on(table.senderId),
    index('idx_messages_created_at').on(table.createdAt),
  ]
);

// ============ NOTIFICATION TABLES ============

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    icon: varchar('icon', { length: 255 }),
    actionUrl: varchar('action_url', { length: 512 }),
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    read: boolean('read').default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_notifications_user_id').on(table.userId),
    index('idx_notifications_read').on(table.read),
    index('idx_notifications_created_at').on(table.createdAt),
  ]
);

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: varchar('platform', { length: 20 }).notNull(),
    token: text('token').notNull(),
    userAgent: text('user_agent'),
    registeredAt: timestamp('registered_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  table => [
    uniqueIndex('idx_push_tokens_token').on(table.token),
    index('idx_push_tokens_user_id').on(table.userId),
  ]
);

// ============ TRAVEL TABLES ============

export const travelDestinations = pgTable(
  'travel_destinations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    nameRu: varchar('name_ru', { length: 255 }).notNull(),
    nameEn: varchar('name_en', { length: 255 }).notNull(),
    nameZh: varchar('name_zh', { length: 255 }).notNull(),
    country: varchar('country', { length: 100 }).notNull(),
    description: text('description'),
    imageUrl: varchar('image_url', { length: 512 }),
    temperature: jsonb('temperature').$type<{ min: number; max: number }>(),
    bestMonths: jsonb('best_months').$type<string[]>(),
    attractions: jsonb('attractions').$type<string[]>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [index('idx_travel_destinations_slug').on(table.slug)]
);

export const travelPackages = pgTable(
  'travel_packages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    destinationId: uuid('destination_id')
      .notNull()
      .references(() => travelDestinations.id, { onDelete: 'restrict' }),
    titleRu: varchar('title_ru', { length: 255 }).notNull(),
    titleEn: varchar('title_en', { length: 255 }).notNull(),
    titleZh: varchar('title_zh', { length: 255 }).notNull(),
    description: text('description'),
    price: numeric('price', { precision: 16, scale: 2 }).notNull(),
    currency: currencyEnum('currency').default('rub').notNull(),
    duration: integer('duration').notNull(),
    status: varchar('status', { length: 50 }).default('active'),
    inclusions: jsonb('inclusions').$type<string[]>(),
    exclusions: jsonb('exclusions').$type<string[]>(),
    rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
    reviewCount: integer('review_count').default(0),
    imageUrl: varchar('image_url', { length: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [index('idx_travel_packages_destination_id').on(table.destinationId)]
);

export const travelBookings = pgTable(
  'travel_bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    publicId: varchar('public_id', { length: 50 }).notNull().unique(),
    packageId: uuid('package_id')
      .notNull()
      .references(() => travelPackages.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).default('pending'),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    passengers: jsonb('passengers').$type<
      { name: string; email: string; phone?: string }[]
    >().notNull(),
    totalPrice: numeric('total_price', { precision: 16, scale: 2 }).notNull(),
    currency: currencyEnum('currency').default('rub').notNull(),
    specialRequests: text('special_requests'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_travel_bookings_user_id').on(table.userId),
    index('idx_travel_bookings_status').on(table.status),
  ]
);

// ============ JOB TABLES ============

export const jobListings = pgTable(
  'job_listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.userId, { onDelete: 'cascade' }),
    titleRu: varchar('title_ru', { length: 255 }).notNull(),
    titleEn: varchar('title_en', { length: 255 }).notNull(),
    titleZh: varchar('title_zh', { length: 255 }).notNull(),
    descriptionRu: text('description_ru'),
    descriptionEn: text('description_en'),
    descriptionZh: text('description_zh'),
    salaryMin: numeric('salary_min', { precision: 16, scale: 2 }),
    salaryMax: numeric('salary_max', { precision: 16, scale: 2 }),
    currency: currencyEnum('currency').default('rub').notNull(),
    type: jobTypeEnum('type').notNull(),
    hskLevel: hskLevelEnum('hsk_level'),
    status: varchar('status', { length: 50 }).default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    location: varchar('location', { length: 255 }),
    remote: boolean('remote').default(false),
    responsibilities: jsonb('responsibilities').$type<string[]>(),
    requirements: jsonb('requirements').$type<string[]>(),
    benefits: jsonb('benefits').$type<string[]>(),
    applicationCount: integer('application_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_job_listings_seller_id').on(table.sellerId),
    index('idx_job_listings_status').on(table.status),
    index('idx_job_listings_expires_at').on(table.expiresAt),
  ]
);

export const jobApplications = pgTable(
  'job_applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => jobListings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).default('pending'),
    resumeUrl: varchar('resume_url', { length: 512 }),
    coverLetter: text('cover_letter'),
    appliedAt: timestamp('applied_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  table => [
    index('idx_job_applications_listing_id').on(table.listingId),
    index('idx_job_applications_user_id').on(table.userId),
    index('idx_job_applications_status').on(table.status),
  ]
);

// ============ METRO TABLES ============

export const metroCities = pgTable(
  'metro_cities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nameRu: varchar('name_ru', { length: 255 }).notNull().unique(),
    nameZh: varchar('name_zh', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    country: varchar('country', { length: 100 }).notNull(),
    imageUrl: varchar('image_url', { length: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [index('idx_metro_cities_slug').on(table.slug)]
);

export const metroLines = pgTable(
  'metro_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cityId: uuid('city_id')
      .notNull()
      .references(() => metroCities.id, { onDelete: 'cascade' }),
    nameRu: varchar('name_ru', { length: 255 }).notNull(),
    nameZh: varchar('name_zh', { length: 255 }).notNull(),
    lineNumber: varchar('line_number', { length: 50 }).notNull(),
    color: varchar('color', { length: 7 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [index('idx_metro_lines_city_id').on(table.cityId)]
);

export const metroStations = pgTable(
  'metro_stations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lineId: uuid('line_id')
      .notNull()
      .references(() => metroLines.id, { onDelete: 'cascade' }),
    nameRu: varchar('name_ru', { length: 255 }).notNull(),
    nameZh: varchar('name_zh', { length: 255 }).notNull(),
    geoLat: numeric('geo_lat', { precision: 10, scale: 6 }),
    geoLon: numeric('geo_lon', { precision: 10, scale: 6 }),
    sort: integer('sort').default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_metro_stations_line_id').on(table.lineId),
    index('idx_metro_stations_sort').on(table.sort),
  ]
);

// ============ ANALYTICS TABLES ============

export const productViews = pgTable(
  'product_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: varchar('session_id', { length: 255 }),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    viewedAt: timestamp('viewed_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_product_views_product_id').on(table.productId),
    index('idx_product_views_user_id').on(table.userId),
    index('idx_product_views_viewed_at').on(table.viewedAt),
  ]
);

export const searchQueries = pgTable(
  'search_queries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    query: varchar('query', { length: 255 }).notNull(),
    locale: localeEnum('locale').default('ru'),
    resultsCount: integer('results_count').default(0),
    clickedProductId: uuid('clicked_product_id'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: varchar('session_id', { length: 255 }),
    queriedAt: timestamp('queried_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('idx_search_queries_query').on(table.query),
    index('idx_search_queries_user_id').on(table.userId),
    index('idx_search_queries_queried_at').on(table.queriedAt),
  ]
);

// ============ RELATIONS ============

export const usersRelations = relations(users, ({ one, many }) => ({
  sellerProfile: one(sellerProfiles, {
    fields: [users.id],
    references: [sellerProfiles.userId],
  }),
  refreshTokens: many(refreshTokens),
  emailVerifications: many(emailVerifications),
  passwordResets: many(passwordResets),
  socialAccounts: many(socialAccounts),
  orders: many(orders),
  reviews: many(reviews),
  jobApplications: many(jobApplications),
  notifications: many(notifications),
  pushTokens: many(pushTokens),
}));

export const sellerProfilesRelations = relations(sellerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [sellerProfiles.userId],
    references: [users.id],
  }),
  products: many(products),
  jobListings: many(jobListings),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parent',
  }),
  children: many(categories, { relationName: 'parent' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(sellerProfiles, {
    fields: [products.sellerId],
    references: [products.userId],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [orders.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));
