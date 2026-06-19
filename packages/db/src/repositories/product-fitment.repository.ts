import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import { products, productFitments } from '../schema';

import type { Database } from '../client';
import type { Product } from './product.repository';

export type ProductFitment = typeof productFitments.$inferSelect;
export type NewProductFitment = typeof productFitments.$inferInsert;

export class ProductFitmentRepository {
  constructor(private readonly db: Database) {}

  /**
   * Активные товары, применимые к транспорту: подходящие конкретной модели
   * (`modelId`) либо всем моделям бренда (`brandId` при `modelId IS NULL`).
   */
  async listProductsForVehicle(brandId: string, modelId: string | null): Promise<Product[]> {
    const brandWide = and(eq(productFitments.brandId, brandId), isNull(productFitments.modelId));
    const match = modelId ? or(eq(productFitments.modelId, modelId), brandWide) : brandWide;

    const idRows = await this.db
      .selectDistinct({ productId: productFitments.productId })
      .from(productFitments)
      .where(match);
    const ids = idRows.map(r => r.productId);
    if (ids.length === 0) return [];

    return this.db
      .select()
      .from(products)
      .where(and(inArray(products.id, ids), eq(products.status, 'active'), isNull(products.deletedAt)));
  }

  async create(data: NewProductFitment): Promise<ProductFitment> {
    const [row] = await this.db.insert(productFitments).values(data).returning();
    if (!row) throw new Error('product_fitments.insert returned no row');
    return row;
  }
}
