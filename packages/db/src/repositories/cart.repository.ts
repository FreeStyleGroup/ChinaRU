import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { cartItems, productImages, products } from '../schema';

import type { Database } from '../client';
import type { Product } from './product.repository';

/** Строка корзины, обогащённая данными товара (для отображения). */
export interface CartLine {
  id: string;
  productId: string;
  qty: number;
  createdAt: Date;
  slug: string;
  nameRu: string;
  nameEn: string | null;
  nameZh: string | null;
  price: string;
  currency: Product['currency'];
  stock: number;
  status: Product['status'];
  imageUrl: string | null;
}

/** Сырая позиция корзины (для оформления заказа). */
export interface RawCartItem {
  productId: string;
  qty: number;
}

export class CartRepository {
  constructor(private readonly db: Database) {}

  /**
   * Позиции корзины пользователя с данными товара и первичным изображением.
   * Товары «по запросу» (цена NULL) в корзину не попадают (CartService), а если
   * продавец снял цену у уже лежащего в корзине товара — позиция не показывается:
   * заказать её по цене нельзя.
   */
  async listByUser(userId: string): Promise<CartLine[]> {
    const rows = await this.db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        qty: cartItems.qty,
        createdAt: cartItems.createdAt,
        slug: products.slug,
        nameRu: products.nameRu,
        nameEn: products.nameEn,
        nameZh: products.nameZh,
        price: products.price,
        currency: products.currency,
        stock: products.stock,
        status: products.status,
        imageUrl: productImages.url,
      })
      .from(cartItems)
      .innerJoin(products, and(eq(products.id, cartItems.productId), isNull(products.deletedAt)))
      .leftJoin(
        productImages,
        and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true))
      )
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.createdAt));
    return rows.flatMap(r => (r.price === null ? [] : [{ ...r, price: r.price }]));
  }

  /** Позиции для оформления заказа — те же, что видит покупатель (без товаров «по запросу»). */
  async rawByUser(userId: string): Promise<RawCartItem[]> {
    return this.db
      .select({ productId: cartItems.productId, qty: cartItems.qty })
      .from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .where(and(eq(cartItems.userId, userId), isNotNull(products.price)));
  }

  /** Добавить товар: если позиция есть — прибавить количество (upsert по user+product). */
  async add(userId: string, productId: string, qty: number): Promise<void> {
    await this.db
      .insert(cartItems)
      .values({ userId, productId, qty })
      .onConflictDoUpdate({
        target: [cartItems.userId, cartItems.productId],
        set: { qty: sql`${cartItems.qty} + ${qty}`, updatedAt: new Date() },
      });
  }

  /** Установить количество позиции (скоуп по владельцу). */
  async updateQty(userId: string, itemId: string, qty: number): Promise<boolean> {
    const rows = await this.db
      .update(cartItems)
      .set({ qty })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)))
      .returning({ id: cartItems.id });
    return rows.length > 0;
  }

  /** Удалить позицию (скоуп по владельцу). */
  async remove(userId: string, itemId: string): Promise<boolean> {
    const rows = await this.db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)))
      .returning({ id: cartItems.id });
    return rows.length > 0;
  }

  /** Очистить корзину пользователя (после оформления заказа). */
  async clear(userId: string): Promise<void> {
    await this.db.delete(cartItems).where(eq(cartItems.userId, userId));
  }
}
