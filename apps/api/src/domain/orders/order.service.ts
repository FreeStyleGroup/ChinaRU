import { NotFoundError } from '../../http/errors';
import { toOrderDto } from '../dto';

import type { OrderRepository } from '@china-ru/db';
import type { CreateOrderInput, OrderDto } from '@china-ru/shared';

export class OrderService {
  constructor(private readonly orders: OrderRepository) {}

  async create(buyerId: string, input: CreateOrderInput): Promise<OrderDto> {
    const order = await this.orders.createWithItems({
      buyerId,
      items: input.items,
      ...(input.currency ? { currency: input.currency } : {}),
    });
    const items = await this.orders.listItems(order.id);
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
