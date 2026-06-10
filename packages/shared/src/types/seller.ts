import type { Address, Currency } from './common';

export type SellerStatus = 'active' | 'banned' | 'pending_verification';
export type SellerTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface SellerProfileDto {
  id: string;
  userId: string;
  companyName: string;
  companyNameCN?: string;
  legalType: 'individual' | 'company' | 'sole_proprietor';
  status: SellerStatus;
  tier: SellerTier;
  logo?: string;
  description?: string;
  address: Address;
  email: string;
  phone: string;
  website?: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  totalSales: number;
  totalRevenue: number;
  currency: Currency;
  verifiedAt?: string;
  joinedAt: string;
  updatedAt: string;
}

export interface CreateSellerProfileRequest {
  companyName: string;
  companyNameCN?: string;
  legalType: 'individual' | 'company' | 'sole_proprietor';
  address: Address;
  phone: string;
  website?: string;
  description?: string;
  logo?: string;
}

export interface UpdateSellerProfileRequest {
  companyName?: string;
  companyNameCN?: string;
  address?: Address;
  phone?: string;
  website?: string;
  description?: string;
  logo?: string;
}

export interface SellerAnalyticsDto {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  activeProducts: number;
  rating: number;
  reviewCount: number;
  responseTime: number;
  shippingOnTime: number;
  periodStart: string;
  periodEnd: string;
}

export interface SellerOrderDto {
  id: string;
  publicId: string;
  buyerId: string;
  buyerName: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerWithdrawalDto {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bankAccount?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface RequestWithdrawalRequest {
  amount: number;
  bankAccount?: string;
  notes?: string;
}
