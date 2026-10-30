import { paginate } from '@china-ru/shared';

import { ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import { toPriceRequestDto } from '../dto';

import type {
  NotificationRepository,
  PriceRequestRepository,
  ProductRepository,
  SellerProfile,
  SellerRepository,
} from '@china-ru/db';
import type {
  CreatePriceRequestInput,
  Paginated,
  PriceRequestDto,
  PriceRequestListQuery,
  PriceRequestStatus,
} from '@china-ru/shared';

/**
 * «Цена по запросу» (B2B): у товара без цены покупатель не кладёт его в корзину,
 * а отправляет продавцу запрос — количество, комментарий, телефон по желанию.
 * Продавец видит запросы с контактами покупателя в кабинете и получает
 * уведомление; отвечает вне платформы и сам ведёт статус.
 */
export class PriceRequestService {
  constructor(
    private readonly products: ProductRepository,
    private readonly sellers: SellerRepository,
    private readonly requests: PriceRequestRepository,
    private readonly notifications: NotificationRepository
  ) {}

  async create(
    buyerId: string,
    productId: string,
    input: { qty: number } & Omit<CreatePriceRequestInput, 'qty'>
  ): Promise<{ id: string }> {
    const product = await this.products.findById(productId);
    if (product?.status !== 'active') {
      throw new NotFoundError('Товар не найден', 'product_not_found');
    }
    if (product.price !== null) {
      throw new ConflictError('У товара указана цена — оформите заказ', 'price_set');
    }
    const seller = await this.sellers.findById(product.sellerId);
    if (!seller) throw new NotFoundError('Товар не найден', 'product_not_found');
    if (seller.userId === buyerId) {
      throw new ConflictError('Это ваш товар', 'own_product');
    }

    const created = await this.requests.createOpen({
      productId,
      sellerId: seller.id,
      buyerId,
      qty: input.qty,
      ...(input.comment ? { comment: input.comment } : {}),
      ...(input.contactPhone ? { contactPhone: input.contactPhone } : {}),
    });
    if (!created) {
      throw new ConflictError(
        'Запрос по этому товару уже отправлен — продавец ответит на него',
        'price_request_exists'
      );
    }

    await this.notifications.create({
      userId: seller.userId,
      type: 'price_request',
      payload: {
        priceRequestId: created.id,
        productId: product.id,
        productSlug: product.slug,
        productName: product.nameRu,
        qty: created.qty,
      },
    });
    return { id: created.id };
  }

  async listForSeller(
    userId: string,
    query: PriceRequestListQuery
  ): Promise<Paginated<PriceRequestDto>> {
    const seller = await this.requireSeller(userId);
    const { rows, total } = await this.requests.listBySeller(
      seller.id,
      query.page,
      query.pageSize,
      query.status
    );
    return paginate(rows.map(toPriceRequestDto), total, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async setStatus(
    userId: string,
    id: string,
    status: PriceRequestStatus
  ): Promise<PriceRequestDto> {
    const seller = await this.requireSeller(userId);
    const row = await this.requests.updateStatusOwned(id, seller.id, status);
    if (!row) throw new NotFoundError('Запрос не найден', 'price_request_not_found');
    return toPriceRequestDto(row);
  }

  private async requireSeller(userId: string): Promise<SellerProfile> {
    const seller = await this.sellers.findByUserId(userId);
    if (!seller) throw new ForbiddenError('Сначала оформите магазин', 'not_a_seller');
    return seller;
  }
}
