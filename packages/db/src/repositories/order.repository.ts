import { and, count, desc, eq, gte, isNull, sql, type SQL } from 'drizzle-orm';

import { orderItems, orders, products } from '../schema';

import type { Database } from '../client';

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

/** Плоская строка «заказ × позиция продавца» для группировки в кабинете продавца. */
export interface SellerOrderRow {
  orderId: string;
  orderNumber: number;
  orderStatus: Order['status'];
  currency: Order['currency'];
  orderCreatedAt: Date;
  itemId: string;
  productId: string;
  nameSnapshot: string;
  qty: number;
  price: string;
  fulfillmentStatus: OrderItem['fulfillmentStatus'];
}

export interface CreateOrderItemInput {
  productId: string;
  qty: number;
}

export interface CreateOrderInput {
  buyerId: string;
  currency?: Order['currency'];
  items: CreateOrderItemInput[];
}

/** Ошибка доменной логики заказа; сервис (R3) маппит code → HTTP. */
export class OrderError extends Error {
  constructor(
    readonly code: 'empty_order' | 'product_unavailable' | 'insufficient_stock' | 'price_on_request',
    message: string
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

export class OrderRepository {
  constructor(private readonly db: Database) {}

  /**
   * Создаёт заказ со списанием остатков в ОДНОЙ транзакции (фикс Haiku: раньше не было tx).
   * Любая ошибка (нет товара / не хватает стока) откатывает всё.
   */
  async createWithItems(input: CreateOrderInput): Promise<Order> {
    if (input.items.length === 0) {
      throw new OrderError('empty_order', 'Order must contain at least one item');
    }

    return this.db.transaction(async tx => {
      let total = 0;
      const snapshots: {
        productId: string;
        sellerId: string;
        qty: number;
        price: string;
        name: string;
      }[] = [];

      for (const item of input.items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, item.productId), isNull(products.deletedAt)))
          .limit(1);

        if (!product) {
          throw new OrderError('product_unavailable', `Product ${item.productId} not found`);
        }
        if (product.status !== 'active') {
          throw new OrderError('product_unavailable', `Product ${item.productId} is unavailable`);
        }
        // «Цена по запросу» — заказать по цене нельзя, только запросить цену у продавца.
        // Проверяется до остатка: у такого товара остаток обычно 0, и покупатель
        // должен узнать причину («запросите цену»), а не «нет в наличии».
        if (product.price === null) {
          throw new OrderError('price_on_request', `Product ${item.productId} has no price`);
        }
        if (product.stock < item.qty) {
          throw new OrderError('insufficient_stock', `Not enough stock for ${item.productId}`);
        }

        total += Number.parseFloat(product.price) * item.qty;
        snapshots.push({
          productId: product.id,
          sellerId: product.sellerId,
          qty: item.qty,
          price: product.price,
          name: product.nameRu,
        });
      }

      const [order] = await tx
        .insert(orders)
        .values({
          buyerId: input.buyerId,
          status: 'pending',
          totalAmount: total.toFixed(2),
          currency: input.currency ?? 'rub',
        })
        .returning();
      if (!order) throw new Error('orders.insert returned no row');

      await tx.insert(orderItems).values(
        snapshots.map(s => ({
          orderId: order.id,
          productId: s.productId,
          sellerId: s.sellerId,
          qty: s.qty,
          price: s.price,
          nameSnapshot: s.name,
        }))
      );

      // Списание стока с защитой от гонки (stock >= qty в WHERE).
      for (const s of snapshots) {
        const updated = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${s.qty}` })
          .where(and(eq(products.id, s.productId), gte(products.stock, s.qty)))
          .returning({ id: products.id });
        if (updated.length === 0) {
          throw new OrderError('insufficient_stock', `Stock changed for ${s.productId}`);
        }
      }

      return order;
    });
  }

  async findById(id: string): Promise<Order | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), isNull(orders.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async listItems(orderId: string): Promise<OrderItem[]> {
    return this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  /** Покупал ли пользователь этот товар (для «отзыв только после покупки»). */
  async hasPurchased(buyerId: string, productId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.buyerId, buyerId),
          eq(orderItems.productId, productId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);
    return row !== undefined;
  }

  async listByBuyer(buyerId: string): Promise<Order[]> {
    return this.db
      .select()
      .from(orders)
      .where(and(eq(orders.buyerId, buyerId), isNull(orders.deletedAt)))
      .orderBy(desc(orders.createdAt));
  }

  /** Все заказы (админка), с опциональным фильтром по статусу. */
  async listAll(
    f: { page?: number; limit?: number; status?: Order['status'] } = {}
  ): Promise<{ rows: Order[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [isNull(orders.deletedAt)];
    if (f.status) conditions.push(eq(orders.status, f.status));
    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(orders).where(where);
    return { rows, total: agg?.value ?? 0 };
  }

  async updateStatus(id: string, status: Order['status']): Promise<Order | null> {
    const [row] = await this.db
      .update(orders)
      .set({ status })
      .where(and(eq(orders.id, id), isNull(orders.deletedAt)))
      .returning();
    return row ?? null;
  }

  /**
   * Строки «заказ × позиция» для одного продавца (кабинет «Заказы»), новые сверху.
   * Один запрос с join; сервис группирует по `orderId`.
   */
  async listSellerOrderRows(sellerId: string): Promise<SellerOrderRow[]> {
    return this.db
      .select({
        orderId: orders.id,
        orderNumber: orders.number,
        orderStatus: orders.status,
        currency: orders.currency,
        orderCreatedAt: orders.createdAt,
        itemId: orderItems.id,
        productId: orderItems.productId,
        nameSnapshot: orderItems.nameSnapshot,
        qty: orderItems.qty,
        price: orderItems.price,
        fulfillmentStatus: orderItems.fulfillmentStatus,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orderItems.sellerId, sellerId), isNull(orders.deletedAt)))
      .orderBy(desc(orders.createdAt));
  }

  /** Текущие статусы исполнения позиций продавца в конкретном заказе (для валидации перехода). */
  async sellerItemFulfillments(
    orderId: string,
    sellerId: string
  ): Promise<OrderItem['fulfillmentStatus'][]> {
    const rows = await this.db
      .select({ fulfillmentStatus: orderItems.fulfillmentStatus })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orderItems.orderId, orderId),
          eq(orderItems.sellerId, sellerId),
          isNull(orders.deletedAt)
        )
      );
    return rows.map(r => r.fulfillmentStatus);
  }

  /** Обновляет статус исполнения всех позиций продавца в заказе разом. Возвращает число затронутых. */
  async updateSellerItemsFulfillment(
    orderId: string,
    sellerId: string,
    status: OrderItem['fulfillmentStatus']
  ): Promise<number> {
    const rows = await this.db
      .update(orderItems)
      .set({ fulfillmentStatus: status })
      .where(and(eq(orderItems.orderId, orderId), eq(orderItems.sellerId, sellerId)))
      .returning({ id: orderItems.id });
    return rows.length;
  }
}
