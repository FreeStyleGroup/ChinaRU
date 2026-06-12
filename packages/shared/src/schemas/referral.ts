import { z } from 'zod';

import { isoDateTime } from '../common';

/**
 * Реферальная программа (MLM). DTO для раздела «Мои партнёры»: персональная ссылка,
 * балансы (баллы + деньги), агрегаты и список партнёров по уровням (1–3).
 */
export const referralPartnerDtoSchema = z.object({
  publicId: z.number().int(),
  name: z.string().nullable(),
  level: z.number().int(),
  joinedAt: isoDateTime,
  /** Доход, который вы получили с этого партнёра (₽, строкой). */
  income: z.string(),
  active: z.boolean(),
});
export type ReferralPartnerDto = z.infer<typeof referralPartnerDtoSchema>;

export const referralLevelInfoSchema = z.object({
  level: z.number().int(),
  percent: z.number(),
  count: z.number().int(),
});

export const referralSummaryDtoSchema = z.object({
  /** Промокод/код приглашения (по числовому publicId). */
  refCode: z.string(),
  refLink: z.string(),
  /** Баллы лояльности (тратятся на портале). */
  points: z.number().int(),
  /** Реферальный денежный баланс (₽, строкой; тратится на портале). */
  balance: z.string(),
  /** Всего заработано денег за всё время (₽, строкой). */
  totalEarned: z.string(),
  totalPartners: z.number().int(),
  levels: z.array(referralLevelInfoSchema),
  partners: z.array(referralPartnerDtoSchema),
});
export type ReferralSummaryDto = z.infer<typeof referralSummaryDtoSchema>;
