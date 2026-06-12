import { z } from 'zod';

import {
  orderStatusSchema,
  reviewStatusSchema,
  sellerVerifyStatusSchema,
  userRoleSchema,
  userStatusSchema,
} from '../enums';
import { paginationQuerySchema } from '../pagination';

/* Запросы списков для админки (query-string → coerce). */

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminOrderListQuerySchema = paginationQuerySchema.extend({
  status: orderStatusSchema.optional(),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const adminSellerListQuerySchema = paginationQuerySchema.extend({
  verifyStatus: sellerVerifyStatusSchema.optional(),
});
export type AdminSellerListQuery = z.infer<typeof adminSellerListQuerySchema>;

export const adminReviewListQuerySchema = paginationQuerySchema.extend({
  status: reviewStatusSchema.optional(),
});
export type AdminReviewListQuery = z.infer<typeof adminReviewListQuerySchema>;

/** Сводка дашборда. */
export const adminStatsSchema = z.object({
  users: z.number().int(),
  products: z.number().int(),
  orders: z.number().int(),
  pendingSellers: z.number().int(),
  pendingReviews: z.number().int(),
  gmv: z.string(),
});
export type AdminStats = z.infer<typeof adminStatsSchema>;
