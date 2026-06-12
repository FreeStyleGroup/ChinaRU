import { pgEnum } from 'drizzle-orm/pg-core';

/** Перечисления домена. Значения синхронизированы с Zod-enum в packages/shared (фаза R2). */

export const userRole = pgEnum('user_role', ['buyer', 'seller', 'admin']);
export const userStatus = pgEnum('user_status', ['active', 'banned', 'pending_verify']);
export const localeEnum = pgEnum('locale', ['ru', 'en', 'zh']);
export const currency = pgEnum('currency', ['rub', 'cny', 'usd', 'eur']);
export const oauthProvider = pgEnum('oauth_provider', ['google', 'yandex', 'vk', 'wechat']);

export const sellerVerifyStatus = pgEnum('seller_verify_status', [
  'unverified',
  'pending',
  'verified',
  'rejected',
]);

export const productStatus = pgEnum('product_status', ['draft', 'active', 'paused', 'banned']);

export const orderStatus = pgEnum('order_status', [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const reviewStatus = pgEnum('review_status', ['pending', 'approved', 'rejected']);

export const jobWorkType = pgEnum('job_work_type', [
  'full_time',
  'part_time',
  'remote',
  'contract',
  'internship',
]);

export const jobStatus = pgEnum('job_status', ['draft', 'active', 'closed']);
export const jobApplicationStatus = pgEnum('job_application_status', [
  'submitted',
  'reviewed',
  'accepted',
  'rejected',
]);

export const bookingStatus = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled']);
export const notificationType = pgEnum('notification_type', ['order', 'review', 'chat', 'system']);
export const devicePlatform = pgEnum('device_platform', ['ios', 'android']);
