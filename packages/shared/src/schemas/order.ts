import { z } from 'zod';

import { idSchema, isoDateTime } from '../common';
import { currencySchema, orderStatusSchema } from '../enums';

/** Позиция создаваемого заказа. */
export const createOrderItemSchema = z.object({
  productId: idSchema,
  qty: z.number().int().min(1).max(100000),
});
export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;

/** Создание заказа. Суммы и снапшоты считает сервер по текущим ценам. */
export const createOrderSchema = z.object({
  items: z.array(createOrderItemSchema).min(1, { error: 'Заказ не может быть пустым' }).max(100),
  currency: currencySchema.optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Смена статуса заказа (продавец/админ); переходы валидирует сервис (R3). */
export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const orderItemDtoSchema = z.object({
  id: idSchema,
  orderId: idSchema,
  productId: idSchema,
  sellerId: idSchema,
  qty: z.number().int(),
  price: z.string(),
  nameSnapshot: z.string(),
  createdAt: isoDateTime,
});
export type OrderItemDto = z.infer<typeof orderItemDtoSchema>;

export const orderDtoSchema = z.object({
  id: idSchema,
  buyerId: idSchema,
  status: orderStatusSchema,
  totalAmount: z.string(),
  currency: currencySchema,
  items: z.array(orderItemDtoSchema),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type OrderDto = z.infer<typeof orderDtoSchema>;
