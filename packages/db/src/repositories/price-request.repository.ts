import { and, count, desc, eq } from 'drizzle-orm';

import { isUniqueViolation } from '../errors';
import { priceRequests, products, users } from '../schema';

import type { Database } from '../client';

export type PriceRequest = typeof priceRequests.$inferSelect;
export type NewPriceRequest = typeof priceRequests.$inferInsert;

/** Запрос цены для кабинета продавца: сам запрос + товар + контакты покупателя. */
export interface PriceRequestRow {
  request: PriceRequest;
  product: { id: string; slug: string; nameRu: string };
  buyer: { name: string | null; email: string };
}

/** Запросы цены по товарам «по запросу» (покупатель → продавец). */
export class PriceRequestRepository {
  constructor(private readonly db: Database) {}

  /**
   * Новый запрос. null — у покупателя уже есть открытый (status = new) запрос по
   * этому товару: так решает частичный уникальный индекс, а не предварительная
   * проверка, поэтому два одновременных запроса не дадут дубль.
   */
  async createOpen(data: NewPriceRequest): Promise<PriceRequest | null> {
    try {
      const [row] = await this.db.insert(priceRequests).values(data).returning();
      if (!row) throw new Error('price_requests.insert returned no row');
      return row;
    } catch (error) {
      if (isUniqueViolation(error, 'price_requests_open_uidx')) return null;
      throw error;
    }
  }

  private rowSelect() {
    return this.db
      .select({
        request: priceRequests,
        product: { id: products.id, slug: products.slug, nameRu: products.nameRu },
        buyer: { name: users.name, email: users.email },
      })
      .from(priceRequests)
      .innerJoin(products, eq(products.id, priceRequests.productId))
      .innerJoin(users, eq(users.id, priceRequests.buyerId));
  }

  async listBySeller(
    sellerId: string,
    page = 1,
    limit = 20,
    status?: PriceRequest['status']
  ): Promise<{ rows: PriceRequestRow[]; total: number }> {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const where = status
      ? and(eq(priceRequests.sellerId, sellerId), eq(priceRequests.status, status))
      : eq(priceRequests.sellerId, sellerId);
    const rows = await this.rowSelect()
      .where(where)
      .orderBy(desc(priceRequests.createdAt), desc(priceRequests.id))
      .limit(l)
      .offset((p - 1) * l);
    const [agg] = await this.db.select({ value: count() }).from(priceRequests).where(where);
    return { rows, total: agg?.value ?? 0 };
  }

  /** Смена статуса с проверкой владельца-продавца на уровне запроса. */
  async updateStatusOwned(
    id: string,
    sellerId: string,
    status: PriceRequest['status']
  ): Promise<PriceRequestRow | null> {
    const [updated] = await this.db
      .update(priceRequests)
      .set({ status })
      .where(and(eq(priceRequests.id, id), eq(priceRequests.sellerId, sellerId)))
      .returning({ id: priceRequests.id });
    if (!updated) return null;
    const [row] = await this.rowSelect().where(eq(priceRequests.id, updated.id)).limit(1);
    return row ?? null;
  }
}
