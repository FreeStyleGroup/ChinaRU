import { paginate } from '@china-ru/shared';

import { toNotificationDto } from '../dto';

import type { NotificationRepository } from '@china-ru/db';
import type {
  MarkNotificationsReadInput,
  NotificationDto,
  NotificationListQuery,
  Paginated,
} from '@china-ru/shared';

/** Лента уведомлений пользователя (упоминания, новые подписчики, жалобы для админов). */
export class NotificationService {
  constructor(private readonly notifications: NotificationRepository) {}

  async list(userId: string, query: NotificationListQuery): Promise<Paginated<NotificationDto>> {
    const { rows, total } = await this.notifications.listByUser(
      userId,
      query.page,
      query.pageSize,
      query.unreadOnly ?? false
    );
    return paginate(rows.map(toNotificationDto), total, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async unreadCount(userId: string): Promise<{ unread: number }> {
    return { unread: await this.notifications.unreadCount(userId) };
  }

  async markRead(userId: string, input: MarkNotificationsReadInput): Promise<{ ok: true }> {
    const ids = input.ids && input.ids.length > 0 ? input.ids : undefined;
    await this.notifications.markRead(userId, ids);
    return { ok: true };
  }
}
