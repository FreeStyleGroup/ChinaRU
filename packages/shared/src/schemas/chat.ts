import { z } from 'zod';

import { idSchema, isoDateTime, timestampsShape } from '../common';

/** Открытие диалога покупателя с продавцом (опционально по товару). */
export const startChatSchema = z.object({
  sellerId: idSchema,
  productId: idSchema.optional(),
  message: z.string().trim().min(1).max(5000),
});
export type StartChatInput = z.infer<typeof startChatSchema>;

/** Отправка сообщения в существующий диалог. */
export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messageDtoSchema = z.object({
  id: idSchema,
  chatId: idSchema,
  authorId: idSchema,
  body: z.string(),
  readAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
});
export type MessageDto = z.infer<typeof messageDtoSchema>;

export const chatDtoSchema = z.object({
  id: idSchema,
  buyerId: idSchema,
  sellerId: idSchema,
  productId: idSchema.nullable(),
  lastMessageAt: isoDateTime.nullable(),
  ...timestampsShape,
});
export type ChatDto = z.infer<typeof chatDtoSchema>;
