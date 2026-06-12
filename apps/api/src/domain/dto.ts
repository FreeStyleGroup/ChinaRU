import type {
  Order,
  OrderItem,
  Product,
  ProductImage,
  ReviewWithAuthor,
  SellerProfile,
  User,
} from '@china-ru/db';
import type {
  OrderDto,
  OrderItemDto,
  ProductDto,
  ProductImageDto,
  ReviewDto,
  SellerProfileDto,
  UserDto,
} from '@china-ru/shared';

/** Единые мапперы строк БД → DTO (контракты R2). Используются всеми сервисами. */

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    email: u.email,
    emailVerified: u.emailVerifiedAt !== null,
    role: u.role,
    status: u.status,
    locale: u.locale,
    name: u.name,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    menuSections: u.menuSections,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export function toSellerProfileDto(s: SellerProfile): SellerProfileDto {
  return {
    id: s.id,
    userId: s.userId,
    companyName: s.companyName,
    companyNameZh: s.companyNameZh,
    legalType: s.legalType,
    inn: s.inn,
    description: s.description,
    rating: s.rating,
    reviewCount: s.reviewCount,
    verifyStatus: s.verifyStatus,
    verifiedAt: s.verifiedAt ? s.verifiedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function toProductImageDto(img: ProductImage): ProductImageDto {
  return { id: img.id, url: img.url, sort: img.sort, isPrimary: img.isPrimary };
}

export function toProductDto(p: Product, images: ProductImage[]): ProductDto {
  return {
    id: p.id,
    sellerId: p.sellerId,
    categoryId: p.categoryId,
    slug: p.slug,
    sku: p.sku,
    nameRu: p.nameRu,
    nameEn: p.nameEn,
    nameZh: p.nameZh,
    descriptionRu: p.descriptionRu,
    descriptionEn: p.descriptionEn,
    descriptionZh: p.descriptionZh,
    price: p.price,
    currency: p.currency,
    stock: p.stock,
    status: p.status,
    rating: p.rating,
    reviewCount: p.reviewCount,
    tags: p.tags,
    images: images.map(toProductImageDto),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toOrderItemDto(i: OrderItem): OrderItemDto {
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

export function toOrderDto(order: Order, items: OrderItem[]): OrderDto {
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

export function toReviewDto(r: ReviewWithAuthor): ReviewDto {
  return {
    id: r.id,
    productId: r.productId,
    sellerId: r.sellerId,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    author: { id: r.authorId, name: r.authorName, avatarUrl: r.authorAvatar },
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
