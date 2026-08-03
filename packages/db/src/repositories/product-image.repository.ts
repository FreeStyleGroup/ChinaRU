import { asc, count, eq, inArray } from 'drizzle-orm';

import { productImages } from '../schema';

import type { Database } from '../client';

export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;

export class ProductImageRepository {
  constructor(private readonly db: Database) {}

  async listByProduct(productId: string): Promise<ProductImage[]> {
    return this.db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sort));
  }

  /** Пакетная загрузка для листинга — без N+1 (один запрос на все товары страницы). */
  async listByProductIds(ids: string[]): Promise<ProductImage[]> {
    if (ids.length === 0) return [];
    return this.db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.sort));
  }

  async add(data: NewProductImage): Promise<ProductImage> {
    const [row] = await this.db.insert(productImages).values(data).returning();
    if (!row) throw new Error('product_images.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<ProductImage | null> {
    const [row] = await this.db
      .select()
      .from(productImages)
      .where(eq(productImages.id, id))
      .limit(1);
    return row ?? null;
  }

  async countByProduct(productId: string): Promise<number> {
    const [agg] = await this.db
      .select({ value: count() })
      .from(productImages)
      .where(eq(productImages.productId, productId));
    return agg?.value ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(productImages).where(eq(productImages.id, id));
  }
}
