import { getDb, orders, orderItems, products } from '@china-ru/db';
import { eq, desc } from 'drizzle-orm';
import { ApiError } from '../../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '@china-ru/shared';
import type { OrderDto, CreateOrderRequest } from '@china-ru/shared';

export const orderService = {
  create: async (userId: string, data: CreateOrderRequest) => {
    const db = getDb();

    // Validate and prepare items
    let subtotal = 0;
    const itemsData = [];

    for (const item of data.items) {
      const [prod] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);

      if (!prod) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, `Product not found: ${item.productId}`);
      }

      if (prod.stock < item.quantity) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, `Insufficient stock for ${prod.nameRu}`);
      }

      const itemTotal = parseFloat(prod.price) * item.quantity;
      subtotal += itemTotal;

      itemsData.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: parseFloat(prod.price),
      });
    }

    // Calculate totals
    const shippingCost = 0; // TODO: Implement shipping calculation
    const tax = 0; // TODO: Implement tax calculation
    const totalAmount = subtotal + shippingCost + tax;

    // Generate public order ID
    const publicId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const [order] = await db
      .insert(orders)
      .values({
        publicId,
        buyerId: userId,
        status: 'pending',
        subtotal: subtotal.toString(),
        shippingCost: shippingCost.toString(),
        tax: tax.toString(),
        totalAmount: totalAmount.toString(),
        currency: data.items[0]?.currency || 'rub',
        shippingAddress: data.shippingAddress,
        notes: data.notes,
      })
      .returning();

    // Create order items
    for (const item of itemsData) {
      await db.insert(orderItems).values({
        orderId: order.id,
        ...item,
      });
    }

    // Decrease product stock
    for (const item of itemsData) {
      const [prod] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      await db
        .update(products)
        .set({ stock: (prod.stock - item.quantity).toString() })
        .where(eq(products.id, item.productId));
    }

    return { order: convertToDto(order), publicId };
  },

  getById: async (orderId: string, userId?: string) => {
    const db = getDb();

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Order not found');
    }

    // Check access
    if (userId && order.buyerId !== userId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, 'Not authorized');
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    return {
      ...convertToDto(order),
      items: items.map(i => ({
        id: i.id,
        productId: i.productId,
        quantity: i.quantity,
        price: parseFloat(i.price),
      })),
    };
  },

  getByPublicId: async (publicId: string, userId?: string) => {
    const db = getDb();

    const [order] = await db.select().from(orders).where(eq(orders.publicId, publicId)).limit(1);

    if (!order) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Order not found');
    }

    if (userId && order.buyerId !== userId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, 'Not authorized');
    }

    return orderService.getById(order.id, userId);
  },

  listByBuyer: async (userId: string, page = 1, limit = 20) => {
    const db = getDb();
    const offset = (page - 1) * limit;

    const buyerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.buyerId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    return buyerOrders.map(convertToDto);
  },

  updateStatus: async (orderId: string, newStatus: string, userId?: string) => {
    const db = getDb();

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Order not found');
    }

    if (userId && order.buyerId !== userId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, 'Not authorized');
    }

    const [updated] = await db
      .update(orders)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    return convertToDto(updated);
  },
};

function convertToDto(o: any): OrderDto {
  return {
    id: o.id,
    publicId: o.publicId,
    buyerId: o.buyerId,
    status: o.status,
    subtotal: parseFloat(o.subtotal),
    shippingCost: parseFloat(o.shippingCost),
    tax: parseFloat(o.tax),
    totalAmount: parseFloat(o.totalAmount),
    currency: o.currency,
    shippingAddress: o.shippingAddress,
    trackingNumber: o.trackingNumber || undefined,
    paymentMethod: o.paymentMethod || undefined,
    notes: o.notes || undefined,
    items: [],
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
