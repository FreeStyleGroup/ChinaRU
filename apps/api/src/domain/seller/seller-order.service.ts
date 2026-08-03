import { ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import { toSellerOrderDto } from '../dto';

import type {
  NotificationRepository,
  OrderRepository,
  SellerOrderRow,
  SellerProfile,
  SellerRepository,
} from '@china-ru/db';
import type { FulfillmentStatus, SellerOrderDto } from '@china-ru/shared';

/**
 * Заказы в кабинете продавца: список своих позиций по заказам и смена статуса
 * исполнения. Мультивендор: продавец управляет только собственными позициями,
 * `fulfillmentStatus` живёт на уровне `order_items`, а не всего заказа.
 */
export class SellerOrderService {
  /** Разрешённые переходы статуса исполнения (продавец). */
  private static readonly TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  constructor(
    private readonly sellers: SellerRepository,
    private readonly orders: OrderRepository,
    private readonly notifications?: NotificationRepository
  ) {}

  private async requireVerifiedSeller(userId: string): Promise<SellerProfile> {
    const seller = await this.sellers.findByUserId(userId);
    if (!seller) throw new ForbiddenError('Сначала оформите магазин', 'not_a_seller');
    if (seller.verifyStatus !== 'verified') {
      throw new ForbiddenError('Магазин ещё не подтверждён', 'seller_not_verified');
    }
    return seller;
  }

  async listMyOrders(userId: string): Promise<SellerOrderDto[]> {
    const seller = await this.requireVerifiedSeller(userId);
    const rows = await this.orders.listSellerOrderRows(seller.id);

    // Группировка по заказу с сохранением порядка (строки уже отсортированы «новые сверху»).
    const grouped = new Map<string, SellerOrderRow[]>();
    for (const row of rows) {
      const bucket = grouped.get(row.orderId);
      if (bucket) bucket.push(row);
      else grouped.set(row.orderId, [row]);
    }
    return [...grouped.values()].map(toSellerOrderDto);
  }

  async setFulfillment(
    userId: string,
    orderId: string,
    status: FulfillmentStatus
  ): Promise<SellerOrderDto> {
    const seller = await this.requireVerifiedSeller(userId);
    const current = await this.orders.sellerItemFulfillments(orderId, seller.id);
    if (current.length === 0) throw new NotFoundError('Заказ не найден', 'order_not_found');

    // Все позиции продавца в заказе меняются разом, поэтому статус у них единый;
    // берём наименее продвинутый как исходный для проверки перехода.
    const from = current.reduce((min, s) => (this.rank(s) < this.rank(min) ? s : min), current[0]!);
    if (from === status) {
      // Идемпотентный no-op — просто возвращаем текущее состояние.
      return this.getMyOrder(seller.id, orderId);
    }
    if (!SellerOrderService.TRANSITIONS[from].includes(status)) {
      throw new ConflictError(
        `Недопустимый переход «${from}» → «${status}»`,
        'invalid_fulfillment_transition'
      );
    }

    await this.orders.updateSellerItemsFulfillment(orderId, seller.id, status);

    if (this.notifications) {
      const order = await this.orders.findById(orderId);
      if (order) {
        await this.notifications.create({
          userId: order.buyerId,
          type: 'order',
          payload: { orderId, fulfillmentStatus: status, seller: seller.companyName },
        });
      }
    }

    return this.getMyOrder(seller.id, orderId);
  }

  private async getMyOrder(sellerId: string, orderId: string): Promise<SellerOrderDto> {
    const rows = await this.orders.listSellerOrderRows(sellerId);
    const mine = rows.filter(r => r.orderId === orderId);
    if (mine.length === 0) throw new NotFoundError('Заказ не найден', 'order_not_found');
    return toSellerOrderDto(mine);
  }

  private rank(s: FulfillmentStatus): number {
    return SellerOrderService.RANK[s];
  }

  private static readonly RANK: Record<FulfillmentStatus, number> = {
    processing: 0,
    shipped: 1,
    delivered: 2,
    cancelled: 3,
  };
}
