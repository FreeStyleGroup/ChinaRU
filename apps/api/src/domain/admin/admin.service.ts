import { paginate } from '@china-ru/shared';

import { NotFoundError } from '../../http/errors';
import { toOrderDto, toProductDto, toReviewDto, toSellerProfileDto, toUserDto } from '../dto';

import type {
  AnalyticsRepository,
  OrderRepository,
  ProductImage,
  ProductImageRepository,
  ProductRepository,
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
  OrderDto,
  Paginated,
  ProductDto,
  ProductListQuery,
  ReviewDto,
  ReviewModerationInput,
  SellerProfileDto,
  SellerVerifyDecisionInput,
  UserDto,
} from '@china-ru/shared';

export interface AdminServiceDeps {
  users: UserRepository;
  sellers: SellerRepository;
  products: ProductRepository;
  productImages: ProductImageRepository;
  orders: OrderRepository;
  reviews: ReviewRepository;
  analytics: AnalyticsRepository;
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

  async verifySeller(id: string, decision: SellerVerifyDecisionInput): Promise<SellerProfileDto> {
    const updated = await this.deps.sellers.update(id, {
      verifyStatus: decision.status,
      verifiedAt: decision.status === 'verified' ? new Date() : null,
    });
    if (!updated) throw new NotFoundError('Продавец не найден', 'seller_not_found');
    return toSellerProfileDto(updated);
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
    input: ReviewModerationInput
  ): Promise<{ id: string; status: string }> {
    const updated = await this.deps.reviews.setStatus(id, input.status);
    if (!updated) throw new NotFoundError('Отзыв не найден', 'review_not_found');
    return { id: updated.id, status: updated.status };
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
