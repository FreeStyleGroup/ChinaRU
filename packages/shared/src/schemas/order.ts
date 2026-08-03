import { z } from 'zod';

import { idSchema, isoDateTime } from '../common';
import { currencySchema, fulfillmentStatusSchema, orderStatusSchema } from '../enums';

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
  fulfillmentStatus: fulfillmentStatusSchema,
  createdAt: isoDateTime,
});
export type OrderItemDto = z.infer<typeof orderItemDtoSchema>;

/** Смена статуса исполнения продавцом; переходы валидирует сервис (R3). */
export const updateFulfillmentSchema = z.object({
  status: fulfillmentStatusSchema,
});
export type UpdateFulfillmentInput = z.infer<typeof updateFulfillmentSchema>;

/** Позиция заказа глазами продавца (только свои товары, с итогом строки). */
export const sellerOrderItemDtoSchema = z.object({
  id: idSchema,
  productId: idSchema,
  nameSnapshot: z.string(),
  qty: z.number().int(),
  price: z.string(),
  lineTotal: z.string(),
  fulfillmentStatus: fulfillmentStatusSchema,
});
export type SellerOrderItemDto = z.infer<typeof sellerOrderItemDtoSchema>;

/**
 * Заказ в кабинете продавца: содержит только его позиции + подытог по ним.
 * `fulfillmentStatus` — агрегат по позициям продавца (действие в UI применяется ко всем сразу).
 */
export const sellerOrderDtoSchema = z.object({
  orderId: idSchema,
  orderStatus: orderStatusSchema,
  currency: currencySchema,
  items: z.array(sellerOrderItemDtoSchema),
  subtotal: z.string(),
  fulfillmentStatus: fulfillmentStatusSchema,
  createdAt: isoDateTime,
});
export type SellerOrderDto = z.infer<typeof sellerOrderDtoSchema>;

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
