import type {
  ApplicationWithApplicant,
  ApplicationWithVacancy,
  JobListing,
  JobListingWithCompany,
  Order,
  OrderItem,
  Product,
  ProductImage,
  Resume,
  ReviewWithAuthor,
  SellerProfile,
  User,
} from '@china-ru/db';
import type {
  ApplicantDto,
  JobListingDto,
  JobListingPublicDto,
  MyApplicationDto,
  OrderDto,
  OrderItemDto,
  ProductDto,
  ProductImageDto,
  ResumeDto,
  ReviewDto,
  SellerProfileDto,
  UserDto,
} from '@china-ru/shared';

/** Единые мапперы строк БД → DTO (контракты R2). Используются всеми сервисами. */

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    publicId: u.publicId,
    nickname: u.nickname,
    email: u.email,
    emailVerified: u.emailVerifiedAt !== null,
    verified: u.verifiedAt !== null,
    role: u.role,
    status: u.status,
    locale: u.locale,
    name: u.name,
    lastName: u.lastName,
    phone: u.phone,
    birthday: u.birthday,
    avatarUrl: u.avatarUrl,
    points: u.points,
    referralBalance: u.referralBalance,
    menuSections: u.menuSections,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export function toSellerProfileDto(s: SellerProfile): SellerProfileDto {
  return {
    id: s.id,
    userId: s.userId,
    publicId: s.publicId,
    nickname: s.nickname,
    companyName: s.companyName,
    companyNameZh: s.companyNameZh,
    legalType: s.legalType,
    inn: s.inn,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
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

export function toResumeDto(r: Resume): ResumeDto {
  return {
    id: r.id,
    userId: r.userId,
    position: r.position,
    category: r.category,
    salary: r.salary,
    experience: r.experience,
    skills: r.skills,
    about: r.about,
    hskLevel: r.hskLevel,
    rating: r.rating,
    reviewCount: r.reviewCount,
    moderationStatus: r.moderationStatus,
    rejectionReason: r.rejectionReason,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toJobListingDto(j: JobListing): JobListingDto {
  return {
    id: j.id,
    sellerId: j.sellerId,
    title: j.title,
    category: j.category,
    description: j.description,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    currency: j.currency,
    hskLevel: j.hskLevel,
    workType: j.workType,
    city: j.city,
    status: j.status,
    moderationStatus: j.moderationStatus,
    rejectionReason: j.rejectionReason,
    publishedAt: j.publishedAt ? j.publishedAt.toISOString() : null,
    expiresAt: j.expiresAt ? j.expiresAt.toISOString() : null,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

export function toJobListingPublicDto(j: JobListingWithCompany): JobListingPublicDto {
  return {
    ...toJobListingDto(j),
    companyName: j.companyName,
    companyPublicId: j.companyPublicId,
    companyVerified: j.companyVerified,
    companyRating: j.companyRating,
  };
}

export function toMyApplicationDto(a: ApplicationWithVacancy): MyApplicationDto {
  return {
    id: a.id,
    listingId: a.listingId,
    status: a.status,
    coverLetter: a.coverLetter,
    createdAt: a.createdAt.toISOString(),
    vacancyTitle: a.vacancyTitle,
    vacancyCity: a.vacancyCity,
    companyName: a.companyName,
  };
}

export function toApplicantDto(a: ApplicationWithApplicant): ApplicantDto {
  return {
    id: a.id,
    status: a.status,
    coverLetter: a.coverLetter,
    createdAt: a.createdAt.toISOString(),
    applicantPublicId: a.applicantPublicId,
    applicantName: a.applicantName,
  };
}
