import { NotFoundError } from '../../http/errors';
import { toOrderDto } from '../dto';

import type { ReferralService } from '../referral/referral.service';
import type { OrderRepository } from '@china-ru/db';
import type { CreateOrderInput, OrderDto } from '@china-ru/shared';

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly referrals?: ReferralService
  ) {}

  async create(buyerId: string, input: CreateOrderInput): Promise<OrderDto> {
    const order = await this.orders.createWithItems({
      buyerId,
      items: input.items,
      ...(input.currency ? { currency: input.currency } : {}),
    });
    const items = await this.orders.listItems(order.id);

    // Реферальные начисления вверх по цепочке (MLM). Первый заказ → бонус за первую сделку.
    if (this.referrals) {
      const buyerOrders = await this.orders.listByBuyer(buyerId);
      await this.referrals.accrue(
        'order',
        buyerId,
        Number(order.totalAmount),
        order.id,
        buyerOrders.length === 1
      );
    }

    return toOrderDto(order, items);
  }

  async listForBuyer(buyerId: string): Promise<OrderDto[]> {
    const orders = await this.orders.listByBuyer(buyerId);
    return Promise.all(
      orders.map(async order => toOrderDto(order, await this.orders.listItems(order.id)))
    );
  }

  async getForBuyer(orderId: string, buyerId: string): Promise<OrderDto> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundError('Заказ не найден', 'order_not_found');
    if (order.buyerId !== buyerId) throw new NotFoundError('Заказ не найден', 'order_not_found');
    const items = await this.orders.listItems(order.id);
    return toOrderDto(order, items);
  }
}
