import { and, count, desc, eq, isNull, type SQL } from 'drizzle-orm';

import { articles } from '../schema';

import type { Database } from '../client';
import type { ArticleSection, ArticleStatus } from '@china-ru/shared';

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ArticleUpdate = Partial<Omit<NewArticle, 'id' | 'createdAt' | 'updatedAt'>>;

export interface ArticleListFilters {
  page?: number;
  limit?: number;
  section?: ArticleSection;
  status?: ArticleStatus;
}

export interface ArticlePublicFilters {
  page?: number;
  limit?: number;
  section?: ArticleSection;
}

export class ArticleRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewArticle): Promise<Article> {
    const [row] = await this.db.insert(articles).values(data).returning();
    if (!row) throw new Error('articles.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<Article | null> {
    const [row] = await this.db
      .select()
      .from(articles)
      .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  /** Опубликованная статья по slug (для публичной детали). */
  async findPublishedBySlug(slug: string): Promise<Article | null> {
    const [row] = await this.db
      .select()
      .from(articles)
      .where(
        and(eq(articles.slug, slug), isNull(articles.deletedAt), eq(articles.status, 'published'))
      )
      .limit(1);
    return row ?? null;
  }

  /** Существует ли статья с таким slug (для генерации уникального). */
  async slugExists(slug: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.slug, slug), isNull(articles.deletedAt)))
      .limit(1);
    return row !== undefined;
  }

  async update(id: string, data: ArticleUpdate): Promise<Article | null> {
    const [row] = await this.db
      .update(articles)
      .set(data)
      .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const [row] = await this.db
      .update(articles)
      .set({ deletedAt: new Date() })
      .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
      .returning({ id: articles.id });
    return row !== undefined;
  }

  /** Админ-список (все статусы). */
  async list(f: ArticleListFilters = {}): Promise<{ rows: Article[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [isNull(articles.deletedAt)];
    if (f.section) conditions.push(eq(articles.section, f.section));
    if (f.status) conditions.push(eq(articles.status, f.status));
    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(articles)
      .where(where)
      .orderBy(desc(articles.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(articles).where(where);
    return { rows, total: agg?.value ?? 0 };
  }

  /** Публичный список — только опубликованные, новейшие сверху. */
  async listPublished(f: ArticlePublicFilters = {}): Promise<{ rows: Article[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(50, Math.max(1, f.limit ?? 12));
    const conditions: SQL[] = [isNull(articles.deletedAt), eq(articles.status, 'published')];
    if (f.section) conditions.push(eq(articles.section, f.section));
    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(articles)
      .where(where)
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(articles).where(where);
    return { rows, total: agg?.value ?? 0 };
  }
}
