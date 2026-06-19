import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { notifications } from '../schema';

import type { Database } from '../client';

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

/** Уведомления пользователю (упоминания, новые подписчики, жалобы админам и т.д.). */
export class NotificationRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewNotification): Promise<Notification> {
    const [row] = await this.db.insert(notifications).values(data).returning();
    if (!row) throw new Error('notifications.insert returned no row');
    return row;
  }

  /** Массовая отправка (например, всем админам про новую жалобу). */
  async createMany(rows: NewNotification[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db.insert(notifications).values(rows);
  }

  async listByUser(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false
  ): Promise<{ rows: Notification[]; total: number }> {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const where = unreadOnly
      ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
      : eq(notifications.userId, userId);
    const rows = await this.db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(l)
      .offset((p - 1) * l);
    const [agg] = await this.db.select({ value: count() }).from(notifications).where(where);
    return { rows, total: agg?.value ?? 0 };
  }

  async unreadCount(userId: string): Promise<number> {
    const [agg] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return agg?.value ?? 0;
  }

  /** Отмечает прочитанными указанные уведомления пользователя, либо все его непрочитанные. */
  async markRead(userId: string, ids?: string[]): Promise<void> {
    const base = and(eq(notifications.userId, userId), isNull(notifications.readAt));
    const where =
      ids && ids.length > 0 ? and(base, inArray(notifications.id, ids)) : base;
    await this.db.update(notifications).set({ readAt: new Date() }).where(where);
  }
}
