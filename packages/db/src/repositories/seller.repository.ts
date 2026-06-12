import { and, count, desc, eq, isNull, type SQL } from 'drizzle-orm';

import { sellerProfiles } from '../schema';

import type { Database } from '../client';

export type SellerProfile = typeof sellerProfiles.$inferSelect;
export type NewSellerProfile = typeof sellerProfiles.$inferInsert;
export type SellerProfileUpdate = Partial<
  Omit<NewSellerProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

export interface SellerListFilters {
  page?: number;
  limit?: number;
  verifyStatus?: SellerProfile['verifyStatus'];
}

export class SellerRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewSellerProfile): Promise<SellerProfile> {
    const [row] = await this.db.insert(sellerProfiles).values(data).returning();
    if (!row) throw new Error('seller_profiles.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<SellerProfile | null> {
    const [row] = await this.db
      .select()
      .from(sellerProfiles)
      .where(and(eq(sellerProfiles.id, id), isNull(sellerProfiles.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async findByUserId(userId: string): Promise<SellerProfile | null> {
    const [row] = await this.db
      .select()
      .from(sellerProfiles)
      .where(and(eq(sellerProfiles.userId, userId), isNull(sellerProfiles.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async update(id: string, patch: SellerProfileUpdate): Promise<SellerProfile | null> {
    const [row] = await this.db
      .update(sellerProfiles)
      .set(patch)
      .where(and(eq(sellerProfiles.id, id), isNull(sellerProfiles.deletedAt)))
      .returning();
    return row ?? null;
  }

  async list(f: SellerListFilters = {}): Promise<{ rows: SellerProfile[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [isNull(sellerProfiles.deletedAt)];
    if (f.verifyStatus) conditions.push(eq(sellerProfiles.verifyStatus, f.verifyStatus));
    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(sellerProfiles)
      .where(where)
      .orderBy(desc(sellerProfiles.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(sellerProfiles).where(where);
    return { rows, total: agg?.value ?? 0 };
  }
}
