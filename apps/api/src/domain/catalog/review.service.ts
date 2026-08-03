import { ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import { toReviewDto } from '../dto';

import type {
  OrderRepository,
  ProductRepository,
  ReviewRepository,
  SellerRepository,
  UserRepository,
} from '@china-ru/db';
import type { CreateReviewInput, ReviewDto } from '@china-ru/shared';

/**
 * Отзывы покупателей на товары. Отзыв оставляет только покупатель этого товара
 * (verified purchase), один на товар; публикуется после модерации (status='pending').
 * После одобрения/отклонения пересчитываются агрегаты рейтинга товара и продавца.
 */
export class ReviewService {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly products: ProductRepository,
    private readonly orders: OrderRepository,
    private readonly sellers: SellerRepository,
    private readonly users: UserRepository
  ) {}

  async createReview(userId: string, input: CreateReviewInput): Promise<ReviewDto> {
    const product = await this.products.findById(input.productId);
    if (!product) throw new NotFoundError('Товар не найден', 'product_not_found');

    const purchased = await this.orders.hasPurchased(userId, input.productId);
    if (!purchased) {
      throw new ForbiddenError('Отзыв можно оставить только после покупки', 'purchase_required');
    }

    const existing = await this.reviews.findByProductAndAuthor(input.productId, userId);
    if (existing) throw new ConflictError('Вы уже оставили отзыв на этот товар', 'review_exists');

    const created = await this.reviews.create({
      productId: input.productId,
      sellerId: product.sellerId,
      authorId: userId,
      rating: input.rating,
      body: input.body,
      status: 'pending',
      ...(input.title !== undefined ? { title: input.title } : {}),
    });

    const author = await this.users.findById(userId);
    return toReviewDto({
      ...created,
      authorName: author?.name ?? null,
      authorAvatar: author?.avatarUrl ?? null,
    });
  }

  /** Публичный список одобренных отзывов товара (новые сверху). */
  async listForProduct(productId: string): Promise<ReviewDto[]> {
    const { rows } = await this.reviews.list({ productId, status: 'approved', limit: 100 });
    return rows.map(toReviewDto);
  }

  /**
   * Пересчёт рейтинга товара и продавца по одобренным отзывам. Вызывается админкой
   * после модерации — одобрение включает отзыв в агрегат, отклонение исключает.
   */
  async recomputeAggregates(productId: string, sellerId: string): Promise<void> {
    const forProduct = await this.reviews.aggregateForProduct(productId);
    await this.products.setRating(productId, forProduct.average, forProduct.count);

    const forSeller = await this.reviews.aggregateForSeller(sellerId);
    await this.sellers.update(sellerId, {
      rating: forSeller.average,
      reviewCount: forSeller.count,
    });
  }
}
