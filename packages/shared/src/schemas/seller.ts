import { z } from 'zod';

import { idSchema, timestampsShape } from '../common';
import { sellerVerifyStatusSchema } from '../enums';

/** Создание/подача профиля продавца на верификацию. */
export const createSellerProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(200),
  companyNameZh: z.string().trim().min(1).max(200).optional(),
  legalType: z.string().trim().max(80).optional(),
  inn: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, { error: 'Некорректный ИНН' })
    .optional(),
  description: z.string().trim().max(4000).optional(),
});
export type CreateSellerProfileInput = z.infer<typeof createSellerProfileSchema>;

/** Редактирование профиля продавца. */
export const updateSellerProfileSchema = createSellerProfileSchema.partial();
export type UpdateSellerProfileInput = z.infer<typeof updateSellerProfileSchema>;

/** Решение модератора по верификации продавца (admin). */
export const sellerVerifyDecisionSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  reason: z.string().trim().max(1000).optional(),
});
export type SellerVerifyDecisionInput = z.infer<typeof sellerVerifyDecisionSchema>;

/** Представление профиля продавца. */
export const sellerProfileDtoSchema = z.object({
  id: idSchema,
  userId: idSchema,
  companyName: z.string(),
  companyNameZh: z.string().nullable(),
  legalType: z.string().nullable(),
  inn: z.string().nullable(),
  description: z.string().nullable(),
  rating: z.string(),
  reviewCount: z.number().int(),
  verifyStatus: sellerVerifyStatusSchema,
  verifiedAt: z.iso.datetime().nullable(),
  ...timestampsShape,
});
export type SellerProfileDto = z.infer<typeof sellerProfileDtoSchema>;
