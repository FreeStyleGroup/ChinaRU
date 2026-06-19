import { and, count, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';

import { postLikes, posts, sellerProfiles, users } from '../schema';

import type { Database } from '../client';

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

/** Автор поста в ленте: человек, компания (магазин) или рекламодатель. */
export type PostAuthor =
  | {
      kind: 'user';
      userId: string;
      publicId: number;
      name: string | null;
      nickname: string | null;
      verified: boolean;
    }
  | {
      kind: 'company';
      sellerId: string;
      publicId: number;
      companyName: string;
      nickname: string | null;
      verified: boolean;
    }
  | { kind: 'ad'; advertiser: string | null };

export type PostWithAuthor = Post & { author: PostAuthor };

interface PostFeedFilters {
  page?: number;
  limit?: number;
  authorUserId?: string;
  sellerId?: string;
}

interface PostAdminFilters {
  page?: number;
  limit?: number;
  status?: Post['status'];
}

interface PostJoinRow {
  post: Post;
  uPublicId: number | null;
  uName: string | null;
  uNickname: string | null;
  uVerifiedAt: Date | null;
  sPublicId: number | null;
  sCompanyName: string | null;
  sNickname: string | null;
  sVerifyStatus: string | null;
}

export class PostRepository {
  constructor(private readonly db: Database) {}

  private base() {
    return this.db
      .select({
        post: posts,
        uPublicId: users.publicId,
        uName: users.name,
        uNickname: users.nickname,
        uVerifiedAt: users.verifiedAt,
        sPublicId: sellerProfiles.publicId,
        sCompanyName: sellerProfiles.companyName,
        sNickname: sellerProfiles.nickname,
        sVerifyStatus: sellerProfiles.verifyStatus,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorUserId, users.id))
      .leftJoin(sellerProfiles, eq(posts.sellerId, sellerProfiles.id));
  }

  private map(r: PostJoinRow): PostWithAuthor {
    let author: PostAuthor;
    if (r.post.isAd) {
      author = { kind: 'ad', advertiser: r.post.advertiser };
    } else if (r.post.sellerId && r.sCompanyName !== null) {
      author = {
        kind: 'company',
        sellerId: r.post.sellerId,
        publicId: r.sPublicId ?? 0,
        companyName: r.sCompanyName,
        nickname: r.sNickname,
        verified: r.sVerifyStatus === 'verified',
      };
    } else {
      author = {
        kind: 'user',
        userId: r.post.authorUserId ?? '',
        publicId: r.uPublicId ?? 0,
        name: r.uName,
        nickname: r.uNickname,
        verified: r.uVerifiedAt !== null,
      };
    }
    return { ...r.post, author };
  }

  async create(data: NewPost): Promise<Post> {
    const [row] = await this.db.insert(posts).values(data).returning();
    if (!row) throw new Error('posts.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<Post | null> {
    const [row] = await this.db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  /** Пост с автором независимо от статуса (для владельца/админа после создания/правок). */
  async findWithAuthor(id: string): Promise<PostWithAuthor | null> {
    const [row] = await this.base()
      .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
      .limit(1);
    return row ? this.map(row) : null;
  }

  /** Опубликованный пост с автором (для детальной страницы). */
  async findPublicWithAuthor(id: string): Promise<PostWithAuthor | null> {
    const [row] = await this.base()
      .where(and(eq(posts.id, id), isNull(posts.deletedAt), eq(posts.status, 'published')))
      .limit(1);
    return row ? this.map(row) : null;
  }

  /** Лента живых постов (без рекламы) — глобальная либо конкретного автора/компании. */
  async listFeed(f: PostFeedFilters = {}): Promise<{ rows: PostWithAuthor[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(50, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [
      isNull(posts.deletedAt),
      eq(posts.status, 'published'),
      eq(posts.isAd, false),
    ];
    if (f.authorUserId) conditions.push(eq(posts.authorUserId, f.authorUserId));
    if (f.sellerId) conditions.push(eq(posts.sellerId, f.sellerId));
    const where = and(...conditions);

    const rows = await this.base()
      .where(where)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(posts).where(where);
    return { rows: rows.map(r => this.map(r)), total: agg?.value ?? 0 };
  }

  /** Лента «по подпискам»: посты подписанных пользователей и компаний (без рекламы). */
  async listFollowingFeed(
    userIds: string[],
    sellerIds: string[],
    page = 1,
    limit = 20
  ): Promise<{ rows: PostWithAuthor[]; total: number }> {
    if (userIds.length === 0 && sellerIds.length === 0) return { rows: [], total: 0 };
    const targets: SQL[] = [];
    if (userIds.length > 0) targets.push(inArray(posts.authorUserId, userIds));
    if (sellerIds.length > 0) targets.push(inArray(posts.sellerId, sellerIds));
    const where = and(
      isNull(posts.deletedAt),
      eq(posts.status, 'published'),
      eq(posts.isAd, false),
      or(...targets)
    );
    const p = Math.max(1, page);
    const l = Math.min(50, Math.max(1, limit));
    const rows = await this.base()
      .where(where)
      .orderBy(desc(posts.createdAt))
      .limit(l)
      .offset((p - 1) * l);
    const [agg] = await this.db.select({ value: count() }).from(posts).where(where);
    return { rows: rows.map(r => this.map(r)), total: agg?.value ?? 0 };
  }

  /** Активные рекламные посты для вставки в ленту. */
  async listActiveAds(limit = 5): Promise<PostWithAuthor[]> {
    const rows = await this.base()
      .where(and(isNull(posts.deletedAt), eq(posts.status, 'published'), eq(posts.isAd, true)))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
    return rows.map(r => this.map(r));
  }

  /** Полный список для модерации (включая скрытые и рекламные). */
  async adminList(f: PostAdminFilters = {}): Promise<{ rows: PostWithAuthor[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [isNull(posts.deletedAt)];
    if (f.status) conditions.push(eq(posts.status, f.status));
    const where = and(...conditions);
    const rows = await this.base()
      .where(where)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(posts).where(where);
    return { rows: rows.map(r => this.map(r)), total: agg?.value ?? 0 };
  }

  async setStatus(id: string, status: Post['status']): Promise<Post | null> {
    const [row] = await this.db
      .update(posts)
      .set({ status })
      .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, id));
  }

  /** Какие из переданных постов лайкнул пользователь (для флага `liked` в ленте). */
  async likedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();
    const rows = await this.db
      .select({ postId: postLikes.postId })
      .from(postLikes)
      .where(and(eq(postLikes.userId, userId), inArray(postLikes.postId, postIds)));
    return new Set(rows.map(r => r.postId));
  }

  /** Тоггл лайка в одной транзакции (вставка/удаление + денормализованный счётчик). */
  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    return this.db.transaction(async tx => {
      const [existing] = await tx
        .select({ id: postLikes.id })
        .from(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        .limit(1);
      const delta = existing ? -1 : 1;
      if (existing) await tx.delete(postLikes).where(eq(postLikes.id, existing.id));
      else await tx.insert(postLikes).values({ postId, userId });
      const [row] = await tx
        .update(posts)
        .set({ likeCount: sql`${posts.likeCount} + ${delta}` })
        .where(eq(posts.id, postId))
        .returning({ likeCount: posts.likeCount });
      return { liked: !existing, likeCount: row?.likeCount ?? 0 };
    });
  }
}
