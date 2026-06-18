import { paginate } from '@china-ru/shared';

import { ForbiddenError, NotFoundError } from '../../http/errors';
import { toPostCommentDto, toPostDto } from '../dto';

import type { PostCommentRepository, PostRepository, SellerRepository } from '@china-ru/db';
import type {
  AdminPostListQuery,
  CreateAdPostInput,
  CreateCommentInput,
  CreatePostInput,
  FeedQuery,
  Paginated,
  PostCommentDto,
  PostDto,
  UserRole,
} from '@china-ru/shared';

/** Рекламный пост вставляется в ленту после каждых N органических постов. */
const AD_EVERY = 5;

/** Соцсеть: посты пользователей и компаний, лента с нативной рекламой, лайки, комментарии. */
export class SocialService {
  constructor(
    private readonly posts: PostRepository,
    private readonly comments: PostCommentRepository,
    private readonly sellers: SellerRepository,
    private readonly apiPublicUrl: string
  ) {}

  /* ── Посты ── */

  async createPost(userId: string, input: CreatePostInput): Promise<PostDto> {
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
    await this.requirePublishedPost(postId);
    const comment = await this.comments.create(postId, userId, input.body);
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

  /* ── helpers ── */

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
