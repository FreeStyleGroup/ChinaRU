import { and, count, eq, isNull } from 'drizzle-orm';

import { follows } from '../schema';

import type { Database } from '../client';

/** Цель подписки: либо пользователь, либо компания (ровно одно). */
export type FollowTarget = { userId: string } | { sellerId: string };

export class FollowRepository {
  constructor(private readonly db: Database) {}

  private targetCond(target: FollowTarget) {
    return 'userId' in target
      ? and(eq(follows.followingUserId, target.userId), isNull(follows.followingSellerId))
      : and(eq(follows.followingSellerId, target.sellerId), isNull(follows.followingUserId));
  }

  /** Подписаться (идемпотентно). Возвращает true, если подписка появилась впервые. */
  async follow(followerId: string, target: FollowTarget): Promise<boolean> {
    const values =
      'userId' in target
        ? { followerId, followingUserId: target.userId }
        : { followerId, followingSellerId: target.sellerId };
    const rows = await this.db
      .insert(follows)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: follows.id });
    return rows.length > 0;
  }

  async unfollow(followerId: string, target: FollowTarget): Promise<void> {
    await this.db.delete(follows).where(and(eq(follows.followerId, followerId), this.targetCond(target)));
  }

  async isFollowing(followerId: string, target: FollowTarget): Promise<boolean> {
    const [row] = await this.db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, followerId), this.targetCond(target)))
      .limit(1);
    return row !== undefined;
  }

  async followingUserIds(followerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: follows.followingUserId })
      .from(follows)
      .where(eq(follows.followerId, followerId));
    return rows.map(r => r.id).filter((id): id is string => id !== null);
  }

  async followingSellerIds(followerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: follows.followingSellerId })
      .from(follows)
      .where(eq(follows.followerId, followerId));
    return rows.map(r => r.id).filter((id): id is string => id !== null);
  }

  async countFollowing(followerId: string): Promise<number> {
    const [agg] = await this.db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followerId, followerId));
    return agg?.value ?? 0;
  }

  async countFollowers(target: FollowTarget): Promise<number> {
    const [agg] = await this.db.select({ value: count() }).from(follows).where(this.targetCond(target));
    return agg?.value ?? 0;
  }
}
