import { z } from 'zod';

import { idSchema, isoDateTime, moneyString, timestampsShape } from '../common';
import {
  currencySchema,
  tenderBidStatusSchema,
  tenderLawSchema,
  tenderMethodSchema,
  tenderStatusSchema,
  type TenderBidStatus,
  type TenderLaw,
  type TenderMethod,
  type TenderStatus,
} from '../enums';
import { paginationQuerySchema } from '../pagination';

/**
 * Тендерная площадка: верифицированная компания-заказчик публикует извещение,
 * другие верифицированные компании подают заявки; заказчик рассматривает (допуск/
 * отклонение) и определяет победителя. Модель процедур — по образцу 44-ФЗ/223-ФЗ.
 */

/* ───────────────── Заказчик: тендер ───────────────── */

export const createTenderSchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(10000),
  method: tenderMethodSchema,
  law: tenderLawSchema.default('commercial'),
  category: z.string().trim().max(120).optional(),
  region: z.string().trim().max(160).optional(),
  deliveryPlace: z.string().trim().max(300).optional(),
  /** НМЦК — начальная (максимальная) цена контракта. */
  startPrice: moneyString.optional(),
  currency: currencySchema.default('rub'),
  /** Обеспечение заявки. */
  bidSecurity: moneyString.optional(),
  /** Обеспечение исполнения контракта. */
  contractSecurity: moneyString.optional(),
  /** Срок окончания приёма заявок. */
  submissionDeadline: isoDateTime,
});
export type CreateTenderInput = z.infer<typeof createTenderSchema>;

export const updateTenderSchema = createTenderSchema.partial();
export type UpdateTenderInput = z.infer<typeof updateTenderSchema>;

/** Определение победителя: выбранная заявка + комментарий к протоколу итогов. */
export const awardTenderSchema = z.object({
  bidId: idSchema,
  comment: z.string().trim().max(2000).optional(),
});
export type AwardTenderInput = z.infer<typeof awardTenderSchema>;

export const cancelTenderSchema = z.object({
  reason: z.string().trim().max(2000).optional(),
});
export type CancelTenderInput = z.infer<typeof cancelTenderSchema>;

/* ───────────────── Участник: заявка ───────────────── */

export const createBidSchema = z.object({
  price: moneyString,
  comment: z.string().trim().max(5000).optional(),
});
export type CreateBidInput = z.infer<typeof createBidSchema>;

export const updateBidSchema = createBidSchema.partial();
export type UpdateBidInput = z.infer<typeof updateBidSchema>;

/** Рассмотрение заявки заказчиком: допуск или отклонение с причиной. */
export const reviewBidSchema = z.object({
  status: z.enum(['admitted', 'rejected']),
  rejectionReason: z.string().trim().max(1000).optional(),
});
export type ReviewBidInput = z.infer<typeof reviewBidSchema>;

/* ───────────────── Запросы (списки) ───────────────── */

/** Публичный реестр тендеров: фильтры по способу/закону/региону + поиск. */
export const tenderListQuerySchema = paginationQuerySchema.extend({
  method: tenderMethodSchema.optional(),
  law: tenderLawSchema.optional(),
  status: tenderStatusSchema.optional(),
  region: z.string().trim().max(160).optional(),
  q: z.string().trim().max(200).optional(),
});
export type TenderListQuery = z.infer<typeof tenderListQuerySchema>;

/** «Мои тендеры» (кабинет заказчика) и «мои заявки» (кабинет участника). */
export const myTenderListQuerySchema = paginationQuerySchema.extend({
  status: tenderStatusSchema.optional(),
});
export type MyTenderListQuery = z.infer<typeof myTenderListQuerySchema>;

/* ───────────────── DTO ───────────────── */

/** Краткая публичная карточка компании (заказчик/участник). */
export const companyRefSchema = z.object({
  sellerId: idSchema,
  publicId: z.number().int(),
  companyName: z.string(),
  nickname: z.string().nullable(),
  verified: z.boolean(),
  rating: z.string(),
});
export type CompanyRefDto = z.infer<typeof companyRefSchema>;

export const tenderDtoSchema = z.object({
  id: idSchema,
  registryNumber: z.number().int(),
  customer: companyRefSchema,
  title: z.string(),
  description: z.string(),
  method: tenderMethodSchema,
  law: tenderLawSchema,
  category: z.string().nullable(),
  region: z.string().nullable(),
  deliveryPlace: z.string().nullable(),
  startPrice: z.string().nullable(),
  currency: currencySchema,
  bidSecurity: z.string().nullable(),
  contractSecurity: z.string().nullable(),
  status: tenderStatusSchema,
  submissionDeadline: isoDateTime,
  publishedAt: isoDateTime.nullable(),
  awardedBidId: idSchema.nullable(),
  awardComment: z.string().nullable(),
  cancelReason: z.string().nullable(),
  bidCount: z.number().int(),
  viewCount: z.number().int(),
  ...timestampsShape,
});
export type TenderDto = z.infer<typeof tenderDtoSchema>;

export const tenderBidDtoSchema = z.object({
  id: idSchema,
  tenderId: idSchema,
  bidder: companyRefSchema,
  price: z.string(),
  comment: z.string().nullable(),
  status: tenderBidStatusSchema,
  rejectionReason: z.string().nullable(),
  ...timestampsShape,
});
export type TenderBidDto = z.infer<typeof tenderBidDtoSchema>;

/** Заявка с краткой сводкой по тендеру — для раздела «Мои заявки» участника. */
export const myTenderBidDtoSchema = tenderBidDtoSchema.extend({
  tenderRegistryNumber: z.number().int(),
  tenderTitle: z.string(),
  tenderStatus: tenderStatusSchema,
});
export type MyTenderBidDto = z.infer<typeof myTenderBidDtoSchema>;

/* ───────────────── Человекочитаемые названия (UI) ───────────────── */

export const TENDER_METHOD_LABELS: Record<TenderMethod, string> = {
  open_tender: 'Открытый конкурс',
  auction: 'Электронный аукцион',
  request_quotations: 'Запрос котировок',
  request_proposals: 'Запрос предложений',
  single_source: 'Единственный поставщик',
};

export const TENDER_LAW_LABELS: Record<TenderLaw, string> = {
  fz44: '44-ФЗ',
  fz223: '223-ФЗ',
  commercial: 'Коммерческий',
};

export const TENDER_STATUS_LABELS: Record<TenderStatus, string> = {
  draft: 'Черновик',
  published: 'Приём заявок',
  review: 'Рассмотрение',
  awarded: 'Определён победитель',
  cancelled: 'Отменён',
  completed: 'Завершён',
};

export const TENDER_BID_STATUS_LABELS: Record<TenderBidStatus, string> = {
  submitted: 'Подана',
  admitted: 'Допущена',
  rejected: 'Отклонена',
  won: 'Победитель',
  lost: 'Не выбрана',
  withdrawn: 'Отозвана',
};
