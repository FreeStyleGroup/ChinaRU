import { contentViolationMessage, inspectContent, paginate } from '@china-ru/shared';

import { ForbiddenError, NotFoundError, ValidationError } from '../../http/errors';
import { toPostCommentDto, toPostDto, toUserRefDto } from '../dto';

import type {
  FollowRepository,
  NotificationRepository,
  PostCommentRepository,
  PostRepository,
  SellerRepository,
  UserRepository,
} from '@china-ru/db';
import type {
  AdminPostListQuery,
  CreateCommentInput,
  CreateAdPostInput,
  CreatePostInput,
  FeedQuery,
  FollowStateDto,
  Paginated,
  PostCommentDto,
  PostDto,
  UserRefDto,
  UserRole,
} from '@china-ru/shared';

/** Упоминание пользователя по публичному ID: `@100123`. */
const MENTION_RE = /@(\d{4,})/g;

/** Рекламный пост вставляется в ленту после каждых N органических постов. */
const AD_EVERY = 5;

/** Соцсеть: посты пользователей и компаний, лента с нативной рекламой, лайки, комментарии. */
export class SocialService {
  constructor(
    private readonly posts: PostRepository,
    private readonly comments: PostCommentRepository,
    private readonly sellers: SellerRepository,
    private readonly users: UserRepository,
    private readonly follows: FollowRepository,
    private readonly notifications: NotificationRepository,
    private readonly apiPublicUrl: string
  ) {}

  /* ── Посты ── */

  async createPost(userId: string, input: CreatePostInput): Promise<PostDto> {
    this.assertCleanContent(input.body);
    let sellerId: string | null = null;
    if (input.asCompany) {
      const seller = await this.sellers.findByUserId(userId);
      const notVerified = 'Публиковать от лица компании может только подтверждённая компания';
      if (!seller) throw new ForbiddenError(notVerified, 'seller_not_verified');
      if (seller.verifyStatus !== 'verified') {
        throw new ForbiddenError(notVerified, 'seller_not_verified');
      }
      sellerId = seller.id;
    }
    const created = await this.posts.create({
      authorUserId: userId,
      body: input.body,
      ...(sellerId ? { sellerId } : {}),
    });
    await this.notifyMentions(input.body, userId, { postId: created.id });
    return this.toDto(created.id, userId);
  }

  async getPost(id: string, viewerId: string | null): Promise<PostDto> {
    const post = await this.posts.findPublicWithAuthor(id);
    if (!post) throw new NotFoundError('Пост не найден', 'post_not_found');
    const liked = await this.likedFlag(viewerId, [post.id]);
    return toPostDto(post, liked.has(post.id), this.apiPublicUrl);
  }

  /** Глобальная лента с нативной вставкой рекламы. */
  async getFeed(query: FeedQuery, viewerId: string | null): Promise<Paginated<PostDto>> {
    const { rows, total } = await this.posts.listFeed({ page: query.page, limit: query.pageSize });
    const ads = await this.posts.listActiveAds();
    const liked = await this.likedFlag(
      viewerId,
      rows.map(r => r.id)
    );
    const items: PostDto[] = [];
    let adIdx = 0;
    rows.forEach((row, i) => {
      items.push(toPostDto(row, liked.has(row.id), this.apiPublicUrl));
      if (ads.length > 0 && (i + 1) % AD_EVERY === 0) {
        const ad = ads[adIdx % ads.length];
        if (ad) items.push(toPostDto(ad, false, this.apiPublicUrl));
        adIdx += 1;
      }
    });
    return paginate(items, total, { page: query.page, pageSize: query.pageSize });
  }

  /** Лента конкретного автора (профиль пользователя или страница компании), без рекламы. */
  async getAuthorFeed(
    target: { authorUserId?: string; sellerId?: string },
    query: FeedQuery,
    viewerId: string | null
  ): Promise<Paginated<PostDto>> {
    const { rows, total } = await this.posts.listFeed({
      page: query.page,
      limit: query.pageSize,
      ...(target.authorUserId ? { authorUserId: target.authorUserId } : {}),
      ...(target.sellerId ? { sellerId: target.sellerId } : {}),
    });
    const liked = await this.likedFlag(
      viewerId,
      rows.map(r => r.id)
    );
    const items = rows.map(r => toPostDto(r, liked.has(r.id), this.apiPublicUrl));
    return paginate(items, total, { page: query.page, pageSize: query.pageSize });
  }

  async deletePost(userId: string, role: UserRole, postId: string): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) throw new NotFoundError('Пост не найден', 'post_not_found');
    if (post.authorUserId !== userId && role !== 'admin') {
      throw new ForbiddenError('Можно удалять только свои посты', 'forbidden');
    }
    await this.posts.softDelete(postId);
  }

  /* ── Лайки ── */

  async toggleLike(userId: string, postId: string): Promise<{ liked: boolean; likeCount: number }> {
    await this.requirePublishedPost(postId);
    return this.posts.toggleLike(postId, userId);
  }

  /* ── Комментарии ── */

  async addComment(
    userId: string,
    postId: string,
    input: CreateCommentInput
  ): Promise<PostCommentDto> {
    this.assertCleanContent(input.body);
    await this.requirePublishedPost(postId);
    const comment = await this.comments.create(postId, userId, input.body);
    await this.notifyMentions(input.body, userId, { postId, commentId: comment.id });
    return toPostCommentDto(comment);
  }

  async listComments(postId: string, query: FeedQuery): Promise<Paginated<PostCommentDto>> {
    const { rows, total } = await this.comments.listByPost(postId, query.page, query.pageSize);
    return paginate(rows.map(toPostCommentDto), total, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async deleteComment(userId: string, role: UserRole, commentId: string): Promise<void> {
    const comment = await this.comments.findById(commentId);
    if (!comment) throw new NotFoundError('Комментарий не найден', 'comment_not_found');
    if (comment.authorUserId !== userId && role !== 'admin') {
      throw new ForbiddenError('Можно удалять только свои комментарии', 'forbidden');
    }
    await this.comments.softDelete(commentId, comment.postId);
  }

  /* ── Админ: реклама и модерация ── */

  async createAd(input: CreateAdPostInput): Promise<PostDto> {
    const created = await this.posts.create({
      body: input.body,
      isAd: true,
      advertiser: input.advertiser,
      adUrl: input.adUrl,
    });
    return this.toDto(created.id, null);
  }

  async adminListPosts(query: AdminPostListQuery): Promise<Paginated<PostDto>> {
    const { rows, total } = await this.posts.adminList({
      page: query.page,
      limit: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
    });
    const items = rows.map(r => toPostDto(r, false, this.apiPublicUrl));
    return paginate(items, total, { page: query.page, pageSize: query.pageSize });
  }

  async setPostStatus(postId: string, status: 'published' | 'hidden'): Promise<PostDto> {
    const updated = await this.posts.setStatus(postId, status);
    if (!updated) throw new NotFoundError('Пост не найден', 'post_not_found');
    return this.toDto(updated.id, null);
  }

  /* ── Подписки ── */

  async followUser(followerId: string, targetUserId: string): Promise<FollowStateDto> {
    if (followerId === targetUserId) {
      throw new ForbiddenError('Нельзя подписаться на самого себя', 'self_follow');
    }
    const target = await this.users.findById(targetUserId);
    if (!target) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    const created = await this.follows.follow(followerId, { userId: targetUserId });
    if (created) {
      await this.notifications.create({
        userId: targetUserId,
        type: 'follow',
        payload: { followerId },
      });
    }
    return this.userFollowState(followerId, targetUserId);
  }

  async unfollowUser(followerId: string, targetUserId: string): Promise<FollowStateDto> {
    await this.follows.unfollow(followerId, { userId: targetUserId });
    return this.userFollowState(followerId, targetUserId);
  }

  async followCompany(followerId: string, sellerId: string): Promise<FollowStateDto> {
    const seller = await this.sellers.findById(sellerId);
    if (!seller) throw new NotFoundError('Компания не найдена', 'seller_not_found');
    const created = await this.follows.follow(followerId, { sellerId });
    if (created && seller.userId !== followerId) {
      await this.notifications.create({
        userId: seller.userId,
        type: 'follow',
        payload: { followerId, sellerId },
      });
    }
    return this.companyFollowState(followerId, sellerId);
  }

  async unfollowCompany(followerId: string, sellerId: string): Promise<FollowStateDto> {
    await this.follows.unfollow(followerId, { sellerId });
    return this.companyFollowState(followerId, sellerId);
  }

  /** Лента «по подпискам» (посты людей и компаний, на которых подписан пользователь). */
  async getFollowingFeed(userId: string, query: FeedQuery): Promise<Paginated<PostDto>> {
    const [userIds, sellerIds] = await Promise.all([
      this.follows.followingUserIds(userId),
      this.follows.followingSellerIds(userId),
    ]);
    const { rows, total } = await this.posts.listFollowingFeed(
      userIds,
      sellerIds,
      query.page,
      query.pageSize
    );
    const liked = await this.likedFlag(
      userId,
      rows.map(r => r.id)
    );
    const items = rows.map(r => toPostDto(r, liked.has(r.id), this.apiPublicUrl));
    return paginate(items, total, { page: query.page, pageSize: query.pageSize });
  }

  /* ── Упоминания ── */

  /** Резолвит пользователя по публичному ID — для линковки `@<publicId>`. */
  async resolveUserByPublicId(publicId: number): Promise<UserRefDto> {
    const user = await this.users.findByPublicId(publicId);
    if (!user) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    return toUserRefDto(user);
  }

  /** Парсит `@<publicId>` в тексте и шлёт упомянутым пользователям уведомление. */
  private async notifyMentions(
    body: string,
    byUserId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const publicIds = [...new Set([...body.matchAll(MENTION_RE)].map(m => Number(m[1])))];
    if (publicIds.length === 0) return;
    const rows: { userId: string; type: 'mention'; payload: Record<string, unknown> }[] = [];
    for (const publicId of publicIds) {
      const mentioned = await this.users.findByPublicId(publicId);
      if (mentioned && mentioned.id !== byUserId) {
        rows.push({ userId: mentioned.id, type: 'mention', payload: { ...payload, byUserId } });
      }
    }
    await this.notifications.createMany(rows);
  }

  private async userFollowState(followerId: string, userId: string): Promise<FollowStateDto> {
    const [following, followersCount] = await Promise.all([
      this.follows.isFollowing(followerId, { userId }),
      this.follows.countFollowers({ userId }),
    ]);
    return { following, followersCount };
  }

  private async companyFollowState(followerId: string, sellerId: string): Promise<FollowStateDto> {
    const [following, followersCount] = await Promise.all([
      this.follows.isFollowing(followerId, { sellerId }),
      this.follows.countFollowers({ sellerId }),
    ]);
    return { following, followersCount };
  }

  /* ── helpers ── */

  /** Контент-модерация: внешние ссылки (антиспам), мат, стоп-слова → 422 с причиной. */
  private assertCleanContent(text: string): void {
    const result = inspectContent(text);
    if (!result.ok) {
      throw new ValidationError({ body: contentViolationMessage(result.violations) });
    }
  }

  private async requirePublishedPost(postId: string): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) throw new NotFoundError('Пост не найден', 'post_not_found');
    if (post.status !== 'published') throw new NotFoundError('Пост не найден', 'post_not_found');
  }

  private async likedFlag(viewerId: string | null, ids: string[]): Promise<Set<string>> {
    if (!viewerId || ids.length === 0) return new Set();
    return this.posts.likedPostIds(viewerId, ids);
  }

  /** Перечитывает пост с автором (любой статус) и отдаёт DTO. */
  private async toDto(id: string, viewerId: string | null): Promise<PostDto> {
    const post = await this.posts.findWithAuthor(id);
    if (!post) throw new NotFoundError('Пост не найден', 'post_not_found');
    const liked = await this.likedFlag(viewerId, [post.id]);
    return toPostDto(post, liked.has(post.id), this.apiPublicUrl);
  }
}
