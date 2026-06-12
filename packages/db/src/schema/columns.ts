import { timestamp } from 'drizzle-orm/pg-core';

/**
 * Общие наборы колонок. Используются спредом в определениях таблиц:
 *   { id: pk(), ...timestamps, ...softDelete }
 * Это гарантирует единый формат created/updated/deleted во всех таблицах.
 */

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Мягкое удаление: deletedAt IS NULL означает «активная» запись. */
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};
