import { z } from 'zod';

import { idSchema, isoDateTime } from '../common';
import { currencySchema } from '../enums';

/** Добавление товара в корзину (qty по умолчанию 1). */
export const addToCartSchema = z.object({
  productId: idSchema,
  qty: z.number().int().min(1).max(100000).default(1),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

/** Изменение количества позиции. */
export const updateCartItemSchema = z.object({
  qty: z.number().int().min(1).max(100000),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

/** Позиция корзины с данными товара для отображения. */
export const cartItemDtoSchema = z.object({
  id: idSchema,
  productId: idSchema,
  qty: z.number().int(),
  slug: z.string(),
  nameRu: z.string(),
  nameEn: z.string().nullable(),
  nameZh: z.string().nullable(),
  price: z.string(),
  currency: currencySchema,
  imageUrl: z.string().nullable(),
  stock: z.number().int(),
  /** Доступна ли позиция к заказу в текущем количестве (активна и хватает остатка). */
  available: z.boolean(),
  lineTotal: z.string(),
  createdAt: isoDateTime,
});
export type CartItemDto = z.infer<typeof cartItemDtoSchema>;

/** Корзина покупателя целиком + агрегаты. */
export const cartDtoSchema = z.object({
  items: z.array(cartItemDtoSchema),
  totalQty: z.number().int(),
  totalAmount: z.string(),
  currency: currencySchema,
});
export type CartDto = z.infer<typeof cartDtoSchema>;
