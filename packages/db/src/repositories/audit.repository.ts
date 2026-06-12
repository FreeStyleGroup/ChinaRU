import { and, desc, eq } from 'drizzle-orm';

import { auditLog } from '../schema';

import type { Database } from '../client';

export type AuditEntry = typeof auditLog.$inferSelect;
export type NewAuditEntry = typeof auditLog.$inferInsert;

/** Журнал чувствительных действий (модерация, смена ролей, верификация). */
export class AuditRepository {
  constructor(private readonly db: Database) {}

  async record(entry: NewAuditEntry): Promise<void> {
    await this.db.insert(auditLog).values(entry);
  }

  async listByEntity(entity: string, entityId: string): Promise<AuditEntry[]> {
    return this.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, entity), eq(auditLog.entityId, entityId)))
      .orderBy(desc(auditLog.createdAt));
  }
}
