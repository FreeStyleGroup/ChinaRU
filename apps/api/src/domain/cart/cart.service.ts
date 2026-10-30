import { BadRequestError, ConflictError, NotFoundError } from '../../http/errors';
import { toCartDto } from '../dto';

import type { OrderService } from '../orders/order.service';
import type { CartRepository, ProductRepository } from '@china-ru/db';
import type { AddToCartInput, CartDto, OrderDto } from '@china-ru/shared';

export class CartService {
  constructor(
    private readonly cart: CartRepository,
    private readonly products: ProductRepository,
    private readonly orders: OrderService
  ) {}

  async getCart(userId: string): Promise<CartDto> {
    return toCartDto(await this.cart.listByUser(userId));
  }

  async addItem(userId: string, input: AddToCartInput): Promise<CartDto> {
    const product = await this.products.findById(input.productId);
    if (!product) throw new NotFoundError('Товар недоступен', 'product_unavailable');
    if (product.status !== 'active') {
      throw new NotFoundError('Товар недоступен', 'product_unavailable');
    }
    // До остатка: у товара «по запросу» остаток обычно 0, а причина — цена.
    if (product.price === null) {
      throw new ConflictError(
        'Цена по запросу — отправьте продавцу запрос цены',
        'price_on_request'
      );
    }
    if (product.stock < 1) {
      throw new BadRequestError('Товара нет в наличии', 'out_of_stock');
    }
    await this.cart.add(userId, input.productId, input.qty);
    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, qty: number): Promise<CartDto> {
    const ok = await this.cart.updateQty(userId, itemId, qty);
    if (!ok) throw new NotFoundError('Позиция корзины не найдена', 'cart_item_not_found');
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartDto> {
    await this.cart.remove(userId, itemId);
    return this.getCart(userId);
  }

  async clear(userId: string): Promise<CartDto> {
    await this.cart.clear(userId);
    return this.getCart(userId);
  }

  /**
   * Оформление заказа из корзины: создаёт заказ по текущим позициям (сервер пересчитывает
   * цены/остатки в транзакции) и очищает корзину. OrderError (нет товара/остатка) маппится
   * центральным обработчиком в 400/409.
   */
  async checkout(userId: string): Promise<OrderDto> {
    const raw = await this.cart.rawByUser(userId);
    if (raw.length === 0) throw new BadRequestError('Корзина пуста', 'empty_cart');
    const order = await this.orders.create(
      userId,
      { items: raw.map(r => ({ productId: r.productId, qty: r.qty })) }
    );
    await this.cart.clear(userId);
    return order;
  }
}
