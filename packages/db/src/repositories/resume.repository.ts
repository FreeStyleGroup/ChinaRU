import { and, count, desc, eq, isNull, type SQL } from 'drizzle-orm';

import { resumes } from '../schema';

import type { Database } from '../client';

export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
export type ResumeUpdate = Partial<Omit<NewResume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

export interface ResumeListFilters {
  page?: number;
  limit?: number;
  moderationStatus?: Resume['moderationStatus'];
}

export class ResumeRepository {
  constructor(private readonly db: Database) {}

  async findByUserId(userId: string): Promise<Resume | null> {
    const [row] = await this.db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, userId), isNull(resumes.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<Resume | null> {
    const [row] = await this.db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, id), isNull(resumes.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  /** Создаёт или обновляет резюме пользователя; любое изменение возвращает его на модерацию. */
  async upsert(userId: string, data: ResumeUpdate): Promise<Resume> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const [row] = await this.db
        .update(resumes)
        .set({ ...data, moderationStatus: 'pending', rejectionReason: null, publishedAt: null })
        .where(eq(resumes.id, existing.id))
        .returning();
      if (!row) throw new Error('resumes.update returned no row');
      return row;
    }
    const [row] = await this.db
      .insert(resumes)
      .values({ userId, position: data.position ?? '', ...data })
      .returning();
    if (!row) throw new Error('resumes.insert returned no row');
    return row;
  }

  async setModeration(
    id: string,
    status: Resume['moderationStatus'],
    rejectionReason: string | null,
    publishedAt: Date | null
  ): Promise<Resume | null> {
    const [row] = await this.db
      .update(resumes)
      .set({ moderationStatus: status, rejectionReason, publishedAt })
      .where(and(eq(resumes.id, id), isNull(resumes.deletedAt)))
      .returning();
    return row ?? null;
  }

  async list(f: ResumeListFilters = {}): Promise<{ rows: Resume[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [isNull(resumes.deletedAt)];
    if (f.moderationStatus) conditions.push(eq(resumes.moderationStatus, f.moderationStatus));
    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(resumes)
      .where(where)
      .orderBy(desc(resumes.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(resumes).where(where);
    return { rows, total: agg?.value ?? 0 };
  }
}
