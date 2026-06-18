import { and, asc, count, eq, isNotNull } from 'drizzle-orm';

import { resumeDocuments } from '../schema';

import type { Database } from '../client';

export type ResumeDocument = typeof resumeDocuments.$inferSelect;
export type NewResumeDocument = typeof resumeDocuments.$inferInsert;

/** Документы резюме (дипломы, сертификаты, подтверждение HSK). Метаданные в БД, файл — в хранилище. */
export class ResumeDocumentRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewResumeDocument): Promise<ResumeDocument> {
    const [row] = await this.db.insert(resumeDocuments).values(data).returning();
    if (!row) throw new Error('resume_documents.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<ResumeDocument | null> {
    const [row] = await this.db
      .select()
      .from(resumeDocuments)
      .where(eq(resumeDocuments.id, id))
      .limit(1);
    return row ?? null;
  }

  async listByResume(resumeId: string): Promise<ResumeDocument[]> {
    return this.db
      .select()
      .from(resumeDocuments)
      .where(eq(resumeDocuments.resumeId, resumeId))
      .orderBy(asc(resumeDocuments.createdAt));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(resumeDocuments).where(eq(resumeDocuments.id, id));
  }

  async setVerified(id: string, verifiedAt: Date | null): Promise<ResumeDocument | null> {
    const [row] = await this.db
      .update(resumeDocuments)
      .set({ verifiedAt })
      .where(eq(resumeDocuments.id, id))
      .returning();
    return row ?? null;
  }

  /** Сколько документов резюме подтверждено модератором (вход для пересчёта рейтинга). */
  async countVerified(resumeId: string): Promise<number> {
    const [agg] = await this.db
      .select({ value: count() })
      .from(resumeDocuments)
      .where(and(eq(resumeDocuments.resumeId, resumeId), isNotNull(resumeDocuments.verifiedAt)));
    return agg?.value ?? 0;
  }
}
