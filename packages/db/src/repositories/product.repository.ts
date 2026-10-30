import { and, asc, count, desc, eq, gte, ilike, isNull, lte, sql, type SQL } from 'drizzle-orm';

import { productImages, products } from '../schema';

import type { Database } from '../client';

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
/** Фото, которое создаётся вместе с товаром (productId подставляется сам). */
export type NewProductImageOfProduct = Omit<typeof productImages.$inferInsert, 'productId'>;
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

    // Товары «по запросу» (цена NULL) при сортировке по цене — в конце списка в обе
    // стороны: у них нет цены, по которой их можно поставить между другими.
    const orderBy =
      f.sortBy === 'price_asc'
        ? sql`${products.price} ASC NULLS LAST`
        : f.sortBy === 'price_desc'
          ? sql`${products.price} DESC NULLS LAST`
          : f.sortBy === 'rating'
            ? desc(products.rating)
            : desc(products.createdAt);

    const rows = await this.db
      .select()
      .from(products)
      .where(where)
      .orderBy(orderBy, asc(products.id))
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

  /** Активных товаров по каждой категории (только категории, где они есть). */
  async countActiveByCategory(): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ categoryId: products.categoryId, value: count() })
      .from(products)
      .where(and(eq(products.status, 'active'), isNull(products.deletedAt)))
      .groupBy(products.categoryId);
    return new Map(rows.map(r => [r.categoryId, r.value]));
  }

  /** Все товары категории в любом статусе (кроме удалённых) — можно ли убрать категорию. */
  async countByCategory(categoryId: string): Promise<number> {
    const [agg] = await this.db
      .select({ value: count() })
      .from(products)
      .where(and(eq(products.categoryId, categoryId), isNull(products.deletedAt)));
    return agg?.value ?? 0;
  }

  /** Активных товаров у продавца (счётчик на странице магазина). */
  async countActiveBySeller(sellerId: string): Promise<number> {
    const [agg] = await this.db
      .select({ value: count() })
      .from(products)
      .where(
        and(
          eq(products.sellerId, sellerId),
          eq(products.status, 'active'),
          isNull(products.deletedAt)
        )
      );
    return agg?.value ?? 0;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNull(products.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  /** Товар продавца по SKU (для проверки уникальности артикула в рамках магазина). */
  async findBySellerSku(sellerId: string, sku: string): Promise<Product | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(
        and(eq(products.sellerId, sellerId), eq(products.sku, sku), isNull(products.deletedAt))
      )
      .limit(1);
    return row ?? null;
  }

  async create(data: NewProduct): Promise<Product> {
    const [row] = await this.db.insert(products).values(data).returning();
    if (!row) throw new Error('products.insert returned no row');
    return row;
  }

  /**
   * Товар вместе с фото — одной транзакцией: опубликованный товар не появится
   * на витрине без картинок, даже если запись фото не удалась.
   */
  async createWithImages(data: NewProduct, images: NewProductImageOfProduct[]): Promise<Product> {
    return this.db.transaction(async tx => {
      const [row] = await tx.insert(products).values(data).returning();
      if (!row) throw new Error('products.insert returned no row');
      if (images.length > 0) {
        await tx.insert(productImages).values(images.map(i => ({ ...i, productId: row.id })));
      }
      return row;
    });
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

  /** Пересчёт агрегатов рейтинга (вызывается после модерации отзыва). */
  async setRating(id: string, rating: string, reviewCount: number): Promise<void> {
    await this.db.update(products).set({ rating, reviewCount }).where(eq(products.id, id));
  }
}
