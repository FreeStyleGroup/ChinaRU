import { NotFoundError } from '../../http/errors';

import type { Order, OrderItem, OrderRepository } from '@china-ru/db';
import type { CreateOrderInput, OrderDto, OrderItemDto } from '@china-ru/shared';

function toOrderItemDto(i: OrderItem): OrderItemDto {
  return {
    id: i.id,
    orderId: i.orderId,
    productId: i.productId,
    sellerId: i.sellerId,
    qty: i.qty,
    price: i.price,
    nameSnapshot: i.nameSnapshot,
    createdAt: i.createdAt.toISOString(),
  };
}

function toOrderDto(order: Order, items: OrderItem[]): OrderDto {
  return {
    id: order.id,
    buyerId: order.buyerId,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    items: items.map(toOrderItemDto),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

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
