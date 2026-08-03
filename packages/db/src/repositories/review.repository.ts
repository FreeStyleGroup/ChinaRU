import { and, avg, count, desc, eq, isNull, type SQL } from 'drizzle-orm';

import { reviews, users } from '../schema';

import type { Database } from '../client';

/** Агрегат одобренных отзывов для пересчёта рейтинга товара/продавца. */
export interface RatingAggregate {
  /** Средний рейтинг с двумя знаками (строка numeric); '0.00' при отсутствии отзывов. */
  average: string;
  count: number;
}

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

/** Отзыв с базовыми полями автора (для модерации в админке). */
export interface ReviewWithAuthor extends Review {
  authorName: string | null;
  authorAvatar: string | null;
}

export interface ReviewListFilters {
  page?: number;
  limit?: number;
  status?: Review['status'];
  productId?: string;
}

export class ReviewRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewReview): Promise<Review> {
    const [row] = await this.db.insert(reviews).values(data).returning();
    if (!row) throw new Error('reviews.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<Review | null> {
    const [row] = await this.db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), isNull(reviews.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async list(f: ReviewListFilters = {}): Promise<{ rows: ReviewWithAuthor[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [isNull(reviews.deletedAt)];
    if (f.status) conditions.push(eq(reviews.status, f.status));
    if (f.productId) conditions.push(eq(reviews.productId, f.productId));
    const where = and(...conditions);

    const rows = await this.db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        sellerId: reviews.sellerId,
        authorId: reviews.authorId,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        status: reviews.status,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        deletedAt: reviews.deletedAt,
        authorName: users.name,
        authorAvatar: users.avatarUrl,
      })
      .from(reviews)
      .leftJoin(users, eq(users.id, reviews.authorId))
      .where(where)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(reviews).where(where);
    return { rows, total: agg?.value ?? 0 };
  }

  async setStatus(id: string, status: Review['status']): Promise<Review | null> {
    const [row] = await this.db
      .update(reviews)
      .set({ status })
      .where(and(eq(reviews.id, id), isNull(reviews.deletedAt)))
      .returning();
    return row ?? null;
  }

  /** Отзыв данного автора на данный товар (защита «один отзыв на товар»). */
  async findByProductAndAuthor(productId: string, authorId: string): Promise<Review | null> {
    const [row] = await this.db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.productId, productId),
          eq(reviews.authorId, authorId),
          isNull(reviews.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  private async aggregate(condition: SQL): Promise<RatingAggregate> {
    const [row] = await this.db
      .select({ average: avg(reviews.rating), value: count() })
      .from(reviews)
      .where(and(condition, eq(reviews.status, 'approved'), isNull(reviews.deletedAt)));
    const raw = row?.average ?? null;
    return {
      average: raw === null ? '0.00' : Number.parseFloat(raw).toFixed(2),
      count: row?.value ?? 0,
    };
  }

  aggregateForProduct(productId: string): Promise<RatingAggregate> {
    return this.aggregate(eq(reviews.productId, productId));
  }

  aggregateForSeller(sellerId: string): Promise<RatingAggregate> {
    return this.aggregate(eq(reviews.sellerId, sellerId));
  }
}
