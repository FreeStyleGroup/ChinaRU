import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { referralEarnings, users } from '../schema';

import type { Database } from '../client';

export type ReferralEarning = typeof referralEarnings.$inferSelect;
export type NewReferralEarning = typeof referralEarnings.$inferInsert;

export interface Ancestor {
  id: string;
  level: number;
}

export interface PartnerRow {
  id: string;
  publicId: number;
  name: string | null;
  level: number;
  joinedAt: Date;
}

export class ReferralRepository {
  constructor(private readonly db: Database) {}

  /** Привязывает пригласившего (один раз, нельзя сам себя). */
  async linkReferrer(userId: string, referrerId: string): Promise<void> {
    if (userId === referrerId) return;
    await this.db
      .update(users)
      .set({ referredBy: referrerId })
      .where(and(eq(users.id, userId), isNull(users.referredBy)));
  }

  async findByPublicId(publicId: number): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.publicId, publicId), isNull(users.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  /** Цепочка пригласивших вверх до `maxDepth` уровней. */
  async ancestors(userId: string, maxDepth: number): Promise<Ancestor[]> {
    const out: Ancestor[] = [];
    let current = userId;
    for (let level = 1; level <= maxDepth; level++) {
      const [row] = await this.db
        .select({ referredBy: users.referredBy })
        .from(users)
        .where(eq(users.id, current))
        .limit(1);
      const parent = row?.referredBy ?? null;
      if (!parent) break;
      out.push({ id: parent, level });
      current = parent;
    }
    return out;
  }

  async recordEarning(row: NewReferralEarning): Promise<void> {
    await this.db.insert(referralEarnings).values(row);
  }

  /** Начисляет деньги (₽) и баллы на баланс пользователя. */
  async addReward(userId: string, money: string, points: number): Promise<void> {
    await this.db
      .update(users)
      .set({
        referralBalance: sql`${users.referralBalance} + ${money}`,
        points: sql`${users.points} + ${points}`,
      })
      .where(eq(users.id, userId));
  }

  /** Партнёры пользователя по уровням 1..maxDepth (нисходящее дерево). */
  async partnersByLevel(userId: string, maxDepth: number): Promise<PartnerRow[]> {
    const out: PartnerRow[] = [];
    let parents = [userId];
    for (let level = 1; level <= maxDepth && parents.length > 0; level++) {
      const rows = await this.db
        .select({
          id: users.id,
          publicId: users.publicId,
          name: users.name,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(inArray(users.referredBy, parents), isNull(users.deletedAt)));
      for (const r of rows) {
        out.push({ id: r.id, publicId: r.publicId, name: r.name, level, joinedAt: r.createdAt });
      }
      parents = rows.map(r => r.id);
    }
    return out;
  }

  /** Суммарный доход пользователя (₽) и по каждому источнику. */
  async incomeBySource(userId: string): Promise<{ total: string; bySource: Map<string, string> }> {
    const rows = await this.db
      .select({
        sourceId: referralEarnings.sourceId,
        sum: sql<string>`coalesce(sum(${referralEarnings.money}), 0)`,
      })
      .from(referralEarnings)
      .where(eq(referralEarnings.beneficiaryId, userId))
      .groupBy(referralEarnings.sourceId);
    const bySource = new Map<string, string>();
    let total = 0;
    for (const r of rows) {
      bySource.set(r.sourceId, r.sum);
      total += Number(r.sum);
    }
    return { total: total.toFixed(2), bySource };
  }
}
