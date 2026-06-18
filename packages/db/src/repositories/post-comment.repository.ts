import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';

import { postComments, posts, users } from '../schema';

import type { Database } from '../client';

export type PostComment = typeof postComments.$inferSelect;

/** Комментарий + публичные данные автора (человек). */
export type CommentWithAuthor = PostComment & {
  authorPublicId: number;
  authorName: string | null;
  authorNickname: string | null;
  authorVerified: boolean;
};

export class PostCommentRepository {
  constructor(private readonly db: Database) {}

  private base() {
    return this.db
      .select({
        comment: postComments,
        authorPublicId: users.publicId,
        authorName: users.name,
        authorNickname: users.nickname,
        authorVerifiedAt: users.verifiedAt,
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.authorUserId, users.id));
  }

  private map(r: {
    comment: PostComment;
    authorPublicId: number;
    authorName: string | null;
    authorNickname: string | null;
    authorVerifiedAt: Date | null;
  }): CommentWithAuthor {
    return {
      ...r.comment,
      authorPublicId: r.authorPublicId,
      authorName: r.authorName,
      authorNickname: r.authorNickname,
      authorVerified: r.authorVerifiedAt !== null,
    };
  }

  async findById(id: string): Promise<PostComment | null> {
    const [row] = await this.db
      .select()
      .from(postComments)
      .where(and(eq(postComments.id, id), isNull(postComments.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  /** Создаёт комментарий и инкрементирует счётчик у поста в одной транзакции. */
  async create(postId: string, authorUserId: string, body: string): Promise<CommentWithAuthor> {
    const id = await this.db.transaction(async tx => {
      const [row] = await tx
        .insert(postComments)
        .values({ postId, authorUserId, body })
        .returning({ id: postComments.id });
      await tx
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} + 1` })
        .where(eq(posts.id, postId));
      if (!row) throw new Error('post_comments.insert returned no row');
      return row.id;
    });
    const [created] = await this.base().where(eq(postComments.id, id)).limit(1);
    if (!created) throw new Error('post_comments.read-after-write failed');
    return this.map(created);
  }

  async listByPost(
    postId: string,
    page = 1,
    limit = 20
  ): Promise<{ rows: CommentWithAuthor[]; total: number }> {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const where = and(eq(postComments.postId, postId), isNull(postComments.deletedAt));
    const rows = await this.base()
      .where(where)
      .orderBy(asc(postComments.createdAt))
      .limit(l)
      .offset((p - 1) * l);
    const [agg] = await this.db.select({ value: count() }).from(postComments).where(where);
    return { rows: rows.map(r => this.map(r)), total: agg?.value ?? 0 };
  }

  /** Мягко удаляет комментарий и декрементирует счётчик поста (в транзакции). */
  async softDelete(id: string, postId: string): Promise<void> {
    await this.db.transaction(async tx => {
      await tx.update(postComments).set({ deletedAt: new Date() }).where(eq(postComments.id, id));
      await tx
        .update(posts)
        .set({ commentCount: sql`GREATEST(${posts.commentCount} - 1, 0)` })
        .where(eq(posts.id, postId));
    });
  }
}
