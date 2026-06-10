import type { Currency } from './common';

export type ProductStatus = 'draft' | 'active' | 'paused' | 'banned';

export interface CategoryDto {
  id: string;
  parentId?: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  nameZh: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  imageUrl?: string;
  depth: number;
  sort: number;
  productCount: number;
  children?: CategoryDto[];
}

export interface ProductImageDto {
  id: string;
  url: string;
  sort: number;
  isPrimary: boolean;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface ProductDto {
  id: string;
  sellerId: string;
  categoryId: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  nameZh: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  status: ProductStatus;
  price: number;
  currency: Currency;
  stock: number;
  rating: number;
  reviewCount: number;
  images: ProductImageDto[];
  variants?: ProductVariantDto[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  categoryId: string;
  nameRu: string;
  nameEn: string;
  nameZh: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  price: number;
  currency: Currency;
  stock: number;
  tags?: string[];
  images?: string[];
  variants?: Omit<ProductVariantDto, 'id'>[];
}

export interface UpdateProductRequest {
  nameRu?: string;
  nameEn?: string;
  nameZh?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  price?: number;
  stock?: number;
  status?: ProductStatus;
  tags?: string[];
  images?: string[];
}

export interface ProductListRequest {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sortBy?: 'new' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
  limit?: number;
}

export interface BrandDto {
  id: string;
  nameRu: string;
  nameEn: string;
  nameZh: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  productCount: number;
}
