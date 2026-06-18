import { paginate } from '@china-ru/shared';

import { NotFoundError } from '../../http/errors';
import {
  toJobListingDto,
  toOrderDto,
  toProductDto,
  toResumeDocumentDto,
  toResumeDto,
  toReviewDto,
  toSellerProfileDto,
  toUserDto,
} from '../dto';
import { computeResumeRating } from '../jobs/resume-rating';

import type {
  AnalyticsRepository,
  AuditRepository,
  JobListingRepository,
  OrderRepository,
  ProductImage,
  ProductImageRepository,
  ProductRepository,
  ResumeDocumentRepository,
  ResumeRepository,
  ReviewRepository,
  SellerRepository,
  UserRepository,
} from '@china-ru/db';
import type {
  AdminOrderListQuery,
  AdminReviewListQuery,
  AdminSellerListQuery,
  AdminStats,
  AdminUserListQuery,
  ContentModerationInput,
  JobListingDto,
  ModerationListQuery,
  OrderDto,
  Paginated,
  ProductDto,
  ProductListQuery,
  ResumeDocumentDto,
  ResumeDto,
  ReviewDto,
  ReviewModerationInput,
  SellerProfileDto,
  SellerVerifyDecisionInput,
  UserDto,
  UserVerifyDecisionInput,
  VerifyResumeDocumentInput,
} from '@china-ru/shared';

export interface AdminServiceDeps {
  users: UserRepository;
  sellers: SellerRepository;
  products: ProductRepository;
  productImages: ProductImageRepository;
  orders: OrderRepository;
  reviews: ReviewRepository;
  resumes: ResumeRepository;
  resumeDocuments: ResumeDocumentRepository;
  listings: JobListingRepository;
  analytics: AnalyticsRepository;
  audit: AuditRepository;
}

/** Кто и откуда выполняет административное действие (для audit_log). */
export interface ActorContext {
  userId: string;
  ip?: string | null;
}

export class AdminService {
  constructor(private readonly deps: AdminServiceDeps) {}

  stats(): Promise<AdminStats> {
    return this.deps.analytics.summary();
  }

  async listUsers(query: AdminUserListQuery): Promise<Paginated<UserDto>> {
    const { rows, total } = await this.deps.users.list({
      page: query.page,
      limit: query.pageSize,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    return paginate(rows.map(toUserDto), total, { page: query.page, pageSize: query.pageSize });
  }

  async listSellers(query: AdminSellerListQuery): Promise<Paginated<SellerProfileDto>> {
    const { rows, total } = await this.deps.sellers.list({
      page: query.page,
      limit: query.pageSize,
      ...(query.verifyStatus ? { verifyStatus: query.verifyStatus } : {}),
    });
    return paginate(rows.map(toSellerProfileDto), total, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async verifySeller(
    id: string,
    decision: SellerVerifyDecisionInput,
    actor: ActorContext
  ): Promise<SellerProfileDto> {
    const updated = await this.deps.sellers.update(id, {
      verifyStatus: decision.status,
      verifiedAt: decision.status === 'verified' ? new Date() : null,
    });
    if (!updated) throw new NotFoundError('Продавец не найден', 'seller_not_found');
    // Подтверждение магазина повышает роль пользователя до продавца.
    if (decision.status === 'verified') {
      await this.deps.users.update(updated.userId, { role: 'seller' });
    }
    await this.deps.audit.record({
      actorId: actor.userId,
      action: 'seller.verify',
      entity: 'seller',
      entityId: id,
      meta: { status: decision.status },
      ip: actor.ip ?? null,
    });
    return toSellerProfileDto(updated);
  }

  /** Верификация пользователя («синяя галочка»): разблокирует выбор никнейма. */
  async verifyUser(
    id: string,
    decision: UserVerifyDecisionInput,
    actor: ActorContext
  ): Promise<UserDto> {
    const updated = await this.deps.users.update(id, {
      verifiedAt: decision.verified ? new Date() : null,
    });
    if (!updated) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    await this.deps.audit.record({
      actorId: actor.userId,
      action: 'user.verify',
      entity: 'user',
      entityId: id,
      meta: { verified: decision.verified },
      ip: actor.ip ?? null,
    });
    return toUserDto(updated);
  }

  async listProducts(query: ProductListQuery): Promise<Paginated<ProductDto>> {
    const result = await this.deps.products.list({
      page: query.page,
      limit: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    const images = await this.groupImages(result.rows.map(p => p.id));
    const items = result.rows.map(p => toProductDto(p, images.get(p.id) ?? []));
    return paginate(items, result.total, { page: query.page, pageSize: query.pageSize });
  }

  async listOrders(query: AdminOrderListQuery): Promise<Paginated<OrderDto>> {
    const { rows, total } = await this.deps.orders.listAll({
      page: query.page,
      limit: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
    });
    const items = await Promise.all(
      rows.map(async order => toOrderDto(order, await this.deps.orders.listItems(order.id)))
    );
    return paginate(items, total, { page: query.page, pageSize: query.pageSize });
  }

  async listReviews(query: AdminReviewListQuery): Promise<Paginated<ReviewDto>> {
    const { rows, total } = await this.deps.reviews.list({
      page: query.page,
      limit: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
    });
    return paginate(rows.map(toReviewDto), total, { page: query.page, pageSize: query.pageSize });
  }

  async moderateReview(
    id: string,
    input: ReviewModerationInput,
    actor: ActorContext
  ): Promise<{ id: string; status: string }> {
    const updated = await this.deps.reviews.setStatus(id, input.status);
    if (!updated) throw new NotFoundError('Отзыв не найден', 'review_not_found');
    await this.deps.audit.record({
      actorId: actor.userId,
      action: 'review.moderate',
      entity: 'review',
      entityId: id,
      meta: { status: input.status },
      ip: actor.ip ?? null,
    });
    return { id: updated.id, status: updated.status };
  }

  async listResumes(query: ModerationListQuery): Promise<Paginated<ResumeDto>> {
    const { rows, total } = await this.deps.resumes.list({
      page: query.page,
      limit: query.pageSize,
      ...(query.status ? { moderationStatus: query.status } : {}),
    });
    return paginate(rows.map(toResumeDto), total, { page: query.page, pageSize: query.pageSize });
  }

  async moderateResume(
    id: string,
    input: ContentModerationInput,
    actor: ActorContext
  ): Promise<ResumeDto> {
    const updated = await this.deps.resumes.setModeration(
      id,
      input.status,
      input.status === 'rejected' ? (input.reason ?? null) : null,
      input.status === 'published' ? new Date() : null
    );
    if (!updated) throw new NotFoundError('Резюме не найдено', 'resume_not_found');
    await this.deps.audit.record({
      actorId: actor.userId,
      action: 'resume.moderate',
      entity: 'resume',
      entityId: id,
      meta: { status: input.status },
      ip: actor.ip ?? null,
    });
    return toResumeDto(updated);
  }

  /** Документы конкретного резюме (для проверки модератором). */
  async listResumeDocuments(resumeId: string): Promise<ResumeDocumentDto[]> {
    const docs = await this.deps.resumeDocuments.listByResume(resumeId);
    return docs.map(toResumeDocumentDto);
  }

  /** Подтверждение/снятие подтверждения документа → пересчёт рейтинга соискателя. */
  async verifyResumeDocument(
    documentId: string,
    input: VerifyResumeDocumentInput,
    actor: ActorContext
  ): Promise<ResumeDocumentDto> {
    const doc = await this.deps.resumeDocuments.setVerified(
      documentId,
      input.verified ? new Date() : null
    );
    if (!doc) throw new NotFoundError('Документ не найден', 'document_not_found');
    const verified = await this.deps.resumeDocuments.countVerified(doc.resumeId);
    await this.deps.resumes.setRating(doc.resumeId, computeResumeRating(verified));
    await this.deps.audit.record({
      actorId: actor.userId,
      action: 'resume_document.verify',
      entity: 'resume_document',
      entityId: documentId,
      meta: { verified: input.verified },
      ip: actor.ip ?? null,
    });
    return toResumeDocumentDto(doc);
  }

  async listVacancies(query: ModerationListQuery): Promise<Paginated<JobListingDto>> {
    const { rows, total } = await this.deps.listings.list({
      page: query.page,
      limit: query.pageSize,
      ...(query.status ? { moderationStatus: query.status } : {}),
    });
    return paginate(rows.map(toJobListingDto), total, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async moderateVacancy(
    id: string,
    input: ContentModerationInput,
    actor: ActorContext
  ): Promise<JobListingDto> {
    const updated = await this.deps.listings.setModeration(
      id,
      input.status,
      input.status === 'rejected' ? (input.reason ?? null) : null,
      input.status === 'published' ? new Date() : null
    );
    if (!updated) throw new NotFoundError('Вакансия не найдена', 'vacancy_not_found');
    await this.deps.audit.record({
      actorId: actor.userId,
      action: 'vacancy.moderate',
      entity: 'vacancy',
      entityId: id,
      meta: { status: input.status },
      ip: actor.ip ?? null,
    });
    return toJobListingDto(updated);
  }

  private async groupImages(ids: string[]): Promise<Map<string, ProductImage[]>> {
    const rows = await this.deps.productImages.listByProductIds(ids);
    const map = new Map<string, ProductImage[]>();
    for (const img of rows) {
      const list = map.get(img.productId);
      if (list) list.push(img);
      else map.set(img.productId, [img]);
    }
    return map;
  }
}
