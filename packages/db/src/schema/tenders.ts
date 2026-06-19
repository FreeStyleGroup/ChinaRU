import { sql } from 'drizzle-orm';
import {
  check,
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
import { currency, tenderBidStatus, tenderLaw, tenderMethod, tenderStatus } from './enums';
import { sellerProfiles } from './users';

/**
 * Тендерная площадка (B2B-закупки). Заказчик — верифицированная компания —
 * публикует извещение (`tenders`); другие верифицированные компании подают заявки
 * (`tenderBids`). Способы и жизненный цикл смоделированы по 44-ФЗ/223-ФЗ:
 * черновик → опубликован (приём заявок до `submissionDeadline`) → рассмотрение
 * (допуск/отклонение заявок) → определение победителя → завершение/отмена.
 */
export const tenders = pgTable(
  'tenders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Публичный реестровый номер тендера. */
    registryNumber: integer('registry_number')
      .generatedByDefaultAsIdentity({ startWith: 100001 })
      .notNull(),
    /** Компания-заказчик (только верифицированная может публиковать). */
    customerSellerId: uuid('customer_seller_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    method: tenderMethod('method').notNull(),
    law: tenderLaw('law').notNull().default('commercial'),
    category: text('category'),
    region: text('region'),
    deliveryPlace: text('delivery_place'),
    /** НМЦК — начальная (максимальная) цена контракта. */
    startPrice: numeric('start_price', { precision: 14, scale: 2 }),
    currency: currency('currency').notNull().default('rub'),
    bidSecurity: numeric('bid_security', { precision: 14, scale: 2 }),
    contractSecurity: numeric('contract_security', { precision: 14, scale: 2 }),
    /** Ключи файлов документации в хранилище (раздаются прокси-роутом). */
    documentKeys: text('document_keys')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: tenderStatus('status').notNull().default('draft'),
    submissionDeadline: timestamp('submission_deadline', { withTimezone: true }).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** Победившая заявка (ссылка на tenderBids; целостность держит сервис). */
    awardedBidId: uuid('awarded_bid_id'),
    awardComment: text('award_comment'),
    cancelReason: text('cancel_reason'),
    bidCount: integer('bid_count').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  t => [
    index('tenders_status_idx').on(t.status),
    index('tenders_method_idx').on(t.method),
    index('tenders_law_idx').on(t.law),
    index('tenders_customer_idx').on(t.customerSellerId),
    index('tenders_created_idx').on(t.createdAt),
    index('tenders_deadline_idx').on(t.submissionDeadline),
    check('tenders_bid_count_chk', sql`${t.bidCount} >= 0`),
    check('tenders_view_count_chk', sql`${t.viewCount} >= 0`),
  ]
);

/**
 * Заявка компании-участника на тендер. Одна заявка на компанию (повторная подача
 * после отзыва обновляет ту же строку). Статус: подана → допущена/отклонена →
 * победитель/проигравшая/отозвана.
 */
export const tenderBids = pgTable(
  'tender_bids',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenderId: uuid('tender_id')
      .notNull()
      .references(() => tenders.id, { onDelete: 'cascade' }),
    bidderSellerId: uuid('bidder_seller_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    /** Предложенная цена (в валюте тендера). */
    price: numeric('price', { precision: 14, scale: 2 }).notNull(),
    comment: text('comment'),
    documentKeys: text('document_keys')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: tenderBidStatus('status').notNull().default('submitted'),
    rejectionReason: text('rejection_reason'),
    ...timestamps,
  },
  t => [
    uniqueIndex('tender_bids_tender_bidder_uidx').on(t.tenderId, t.bidderSellerId),
    index('tender_bids_tender_idx').on(t.tenderId),
    index('tender_bids_bidder_idx').on(t.bidderSellerId),
    index('tender_bids_status_idx').on(t.status),
  ]
);
