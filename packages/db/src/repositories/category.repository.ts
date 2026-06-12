import { and, asc, eq, isNull } from 'drizzle-orm';

import { categories } from '../schema';

import type { Database } from '../client';

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export class CategoryRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewCategory): Promise<Category> {
    const [row] = await this.db.insert(categories).values(data).returning();
    if (!row) throw new Error('categories.insert returned no row');
    return row;
  }

  /** Все активные категории, отсортированные по sort. */
  async listAll(): Promise<Category[]> {
    return this.db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.sort), asc(categories.nameRu));
  }

  /** Прямые потомки категории (parentId = null → корни). */
  async listChildren(parentId: string | null): Promise<Category[]> {
    const parentCond =
      parentId === null ? isNull(categories.parentId) : eq(categories.parentId, parentId);
    return this.db
      .select()
      .from(categories)
      .where(and(parentCond, isNull(categories.deletedAt)))
      .orderBy(asc(categories.sort));
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), isNull(categories.deletedAt)))
      .limit(1);
    return row ?? null;
  }
}
