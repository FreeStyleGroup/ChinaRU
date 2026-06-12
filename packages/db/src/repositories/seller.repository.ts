import { and, eq, isNull } from 'drizzle-orm';

import { sellerProfiles } from '../schema';

import type { Database } from '../client';

export type SellerProfile = typeof sellerProfiles.$inferSelect;
export type NewSellerProfile = typeof sellerProfiles.$inferInsert;
export type SellerProfileUpdate = Partial<
  Omit<NewSellerProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

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
}
