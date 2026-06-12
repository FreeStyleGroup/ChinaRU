import { z } from 'zod';

import { idSchema, isoDateTime } from '../common';
import { notificationTypeSchema } from '../enums';
import { paginationQuerySchema } from '../pagination';

/** Фильтр списка уведомлений. */
export const notificationListQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

/** Отметить уведомления прочитанными (по id или все). */
export const markNotificationsReadSchema = z.object({
  ids: z.array(idSchema).max(500).optional(),
  all: z.boolean().optional(),
});
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;

export const notificationDtoSchema = z.object({
  id: idSchema,
  userId: idSchema,
  type: notificationTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  readAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
});
export type NotificationDto = z.infer<typeof notificationDtoSchema>;
