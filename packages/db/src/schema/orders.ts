import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { products } from './catalog';
import { softDelete, timestamps } from './columns';
import { currency, orderStatus } from './enums';
import { sellerProfiles, users } from './users';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: orderStatus('status').notNull().default('pending'),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
    currency: currency('currency').notNull().default('rub'),
    ...timestamps,
    ...softDelete,
  },
  t => [index('orders_buyer_idx').on(t.buyerId), index('orders_status_idx').on(t.status)]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'restrict' }),
    qty: integer('qty').notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    nameSnapshot: text('name_snapshot').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index('order_items_order_idx').on(t.orderId),
    index('order_items_product_idx').on(t.productId),
    index('order_items_seller_idx').on(t.sellerId),
    check('order_items_qty_chk', sql`${t.qty} > 0`),
  ]
);
