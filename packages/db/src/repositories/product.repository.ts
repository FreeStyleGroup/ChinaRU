import { and, asc, count, desc, eq, gte, ilike, isNull, lte, type SQL } from 'drizzle-orm';

import { products } from '../schema';

import type { Database } from '../client';

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductUpdate = Partial<
  Omit<NewProduct, 'id' | 'sellerId' | 'createdAt' | 'updatedAt'>
>;

export type ProductSort = 'price_asc' | 'price_desc' | 'rating' | 'new';

export interface ProductListFilters {
  categoryId?: string;
  sellerId?: string;
  status?: Product['status'];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: ProductSort;
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export class ProductRepository {
  constructor(private readonly db: Database) {}

  /** Собираем условия один раз — и для выборки, и для count (общий источник фильтров). */
  private buildConditions(f: ProductListFilters): SQL[] {
    const conditions: SQL[] = [isNull(products.deletedAt)];
    if (f.status) conditions.push(eq(products.status, f.status));
    if (f.categoryId) conditions.push(eq(products.categoryId, f.categoryId));
    if (f.sellerId) conditions.push(eq(products.sellerId, f.sellerId));
    if (f.minPrice !== undefined) conditions.push(gte(products.price, f.minPrice.toString()));
    if (f.maxPrice !== undefined) conditions.push(lte(products.price, f.maxPrice.toString()));
    if (f.search) conditions.push(ilike(products.nameRu, `%${f.search}%`));
    return conditions;
  }

  async list(f: ProductListFilters = {}): Promise<Paginated<Product>> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const offset = (page - 1) * limit;

    const where = and(...this.buildConditions(f));

    const orderBy =
      f.sortBy === 'price_asc'
        ? asc(products.price)
        : f.sortBy === 'price_desc'
          ? desc(products.price)
          : f.sortBy === 'rating'
            ? desc(products.rating)
            : desc(products.createdAt);

    const rows = await this.db
      .select()
      .from(products)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // count применяет ТЕ ЖЕ условия `where`, что и выборка (фикс Haiku-бага с рассинхроном).
    const [agg] = await this.db.select({ value: count() }).from(products).where(where);
    const total = agg?.value ?? 0;

    return { rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findById(id: string): Promise<Product | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNull(products.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async create(data: NewProduct): Promise<Product> {
    const [row] = await this.db.insert(products).values(data).returning();
    if (!row) throw new Error('products.insert returned no row');
    return row;
  }

  /** Обновление с проверкой владельца (продавца) — на уровне запроса. */
  async updateOwned(id: string, sellerId: string, patch: ProductUpdate): Promise<Product | null> {
    const [row] = await this.db
      .update(products)
      .set(patch)
      .where(and(eq(products.id, id), eq(products.sellerId, sellerId), isNull(products.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDeleteOwned(id: string, sellerId: string): Promise<boolean> {
    const rows = await this.db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.sellerId, sellerId), isNull(products.deletedAt)))
      .returning({ id: products.id });
    return rows.length > 0;
  }
}
