import { and, count, desc, eq, ilike, isNull, type SQL } from 'drizzle-orm';

import { resumes, users } from '../schema';

import type { Database } from '../client';

export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
export type ResumeUpdate = Partial<Omit<NewResume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

/** Резюме + публичные данные соискателя (для витрины/детали). */
export type ResumeWithUser = Resume & {
  candidatePublicId: number;
  candidateName: string | null;
  candidateNickname: string | null;
  candidateVerified: boolean;
};

export interface ResumeListFilters {
  page?: number;
  limit?: number;
  moderationStatus?: Resume['moderationStatus'];
}

export interface ResumePublicFilters {
  page?: number;
  limit?: number;
  category?: Resume['category'];
  experience?: Resume['experience'];
  hskLevel?: number;
  search?: string;
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

  /** Устанавливает рейтинг соискателя (пересчитывается по подтверждённым документам). */
  async setRating(id: string, rating: string): Promise<Resume | null> {
    const [row] = await this.db
      .update(resumes)
      .set({ rating })
      .where(and(eq(resumes.id, id), isNull(resumes.deletedAt)))
      .returning();
    return row ?? null;
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

  private withUser() {
    return this.db
      .select({
        resume: resumes,
        candidatePublicId: users.publicId,
        candidateName: users.name,
        candidateNickname: users.nickname,
        candidateVerifiedAt: users.verifiedAt,
      })
      .from(resumes)
      .innerJoin(users, eq(resumes.userId, users.id));
  }

  private mapUser(r: {
    resume: Resume;
    candidatePublicId: number;
    candidateName: string | null;
    candidateNickname: string | null;
    candidateVerifiedAt: Date | null;
  }): ResumeWithUser {
    return {
      ...r.resume,
      candidatePublicId: r.candidatePublicId,
      candidateName: r.candidateName,
      candidateNickname: r.candidateNickname,
      candidateVerified: r.candidateVerifiedAt !== null,
    };
  }

  /** Публичная база резюме — только опубликованные, с данными соискателя. */
  async listPublic(f: ResumePublicFilters = {}): Promise<{ rows: ResumeWithUser[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [
      isNull(resumes.deletedAt),
      isNull(users.deletedAt),
      eq(resumes.moderationStatus, 'published'),
    ];
    if (f.category) conditions.push(eq(resumes.category, f.category));
    if (f.experience) conditions.push(eq(resumes.experience, f.experience));
    if (f.hskLevel) conditions.push(eq(resumes.hskLevel, f.hskLevel));
    if (f.search) conditions.push(ilike(resumes.position, `%${f.search}%`));
    const where = and(...conditions);

    const rows = await this.withUser()
      .where(where)
      .orderBy(desc(resumes.publishedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db
      .select({ value: count() })
      .from(resumes)
      .innerJoin(users, eq(resumes.userId, users.id))
      .where(where);
    return { rows: rows.map(r => this.mapUser(r)), total: agg?.value ?? 0 };
  }

  async findPublicById(id: string): Promise<ResumeWithUser | null> {
    const [row] = await this.withUser()
      .where(
        and(
          eq(resumes.id, id),
          isNull(resumes.deletedAt),
          isNull(users.deletedAt),
          eq(resumes.moderationStatus, 'published')
        )
      )
      .limit(1);
    return row ? this.mapUser(row) : null;
  }

  /** Кол-во опубликованных резюме по каждой категории (для витрины). */
  async countByCategory(): Promise<{ category: string | null; count: number }[]> {
    const rows = await this.db
      .select({ category: resumes.category, value: count() })
      .from(resumes)
      .where(and(isNull(resumes.deletedAt), eq(resumes.moderationStatus, 'published')))
      .groupBy(resumes.category);
    return rows.map(r => ({ category: r.category, count: r.value }));
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
