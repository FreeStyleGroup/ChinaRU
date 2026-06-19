import { and, count, desc, eq, type SQL } from 'drizzle-orm';

import { reports } from '../schema';

import type { Database } from '../client';

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

interface ReportListFilters {
  page?: number;
  limit?: number;
  status?: Report['status'];
}

/** Жалобы на контент (посты/пользователей) — очередь модерации. */
export class ReportRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewReport): Promise<Report> {
    const [row] = await this.db.insert(reports).values(data).returning();
    if (!row) throw new Error('reports.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<Report | null> {
    const [row] = await this.db.select().from(reports).where(eq(reports.id, id)).limit(1);
    return row ?? null;
  }

  async list(f: ReportListFilters = {}): Promise<{ rows: Report[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [];
    if (f.status) conditions.push(eq(reports.status, f.status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await this.db
      .select()
      .from(reports)
      .where(where)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(reports).where(where);
    return { rows, total: agg?.value ?? 0 };
  }

  async resolve(
    id: string,
    status: Report['status'],
    resolvedById: string
  ): Promise<Report | null> {
    const [row] = await this.db
      .update(reports)
      .set({ status, resolvedById, resolvedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return row ?? null;
  }
}
