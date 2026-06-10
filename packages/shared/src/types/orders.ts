import type { Address, Currency } from './common';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  variantId?: string;
  quantity: number;
  price: number;
  currency: Currency;
}

export interface OrderDto {
  id: string;
  publicId: string;
  buyerId: string;
  items: OrderItemDto[];
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  currency: Currency;
  shippingAddress: Address;
  trackingNumber?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
  shippingAddress: Address;
  shippingMethod?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  publicId: string;
  totalAmount: number;
  currency: Currency;
  paymentUrl?: string;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  trackingNumber?: string;
  notes?: string;
}

export interface OrderHistoryItemDto {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedAt: string;
  changedBy: string;
  notes?: string;
}

export interface RefundRequestDto {
  id: string;
  orderId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  currency: Currency;
  requestedAt: string;
  resolvedAt?: string;
}

export interface CreateRefundRequest {
  orderId: string;
  reason: string;
  amount?: number;
}
