import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { products } from './catalog';
import { timestamps } from './columns';
import { users } from './users';

/**
 * Корзина покупателя = набор строк cart_items, привязанных к пользователю.
 * Отдельная таблица «carts» не нужна: корзина пользователя — это его строки.
 * Одна позиция на товар (uniqueIndex user+product), количество меняется на месте.
 * Soft-delete не нужен — удаление из корзины это hard delete.
 */
export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    qty: integer('qty').notNull().default(1),
    ...timestamps,
  },
  t => [
    uniqueIndex('cart_items_user_product_uidx').on(t.userId, t.productId),
    index('cart_items_user_idx').on(t.userId),
    index('cart_items_product_idx').on(t.productId),
    check('cart_items_qty_chk', sql`${t.qty} > 0`),
  ]
);
