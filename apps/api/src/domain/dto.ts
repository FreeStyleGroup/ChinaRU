import { aggregateFulfillment } from '@china-ru/shared';

import type {
  ApplicationWithApplicant,
  ApplicationWithVacancy,
  Article,
  BidWithBidder,
  CartLine,
  CommentWithAuthor,
  CompanyRef,
  ContentAgent,
  JobListing,
  JobListingWithCompany,
  MyBid,
  Notification,
  Order,
  OrderItem,
  SellerOrderRow,
  PostWithAuthor,
  Product,
  Report,
  ProductImage,
  Resume,
  ResumeDocument,
  ResumeWithUser,
  ReviewWithAuthor,
  SellerProfile,
  TenderWithCustomer,
  BrandWithCount,
  VehicleModel,
  DealerWithBrands,
  GarageVehicleRow,
  User,
} from '@china-ru/db';
import type {
  ApplicantDto,
  ArticleCardDto,
  ArticleDto,
  ArticlePublicDto,
  CartDto,
  CompanyRefDto,
  ContentAgentDto,
  JobListingDto,
  JobListingPublicDto,
  MyApplicationDto,
  MyTenderBidDto,
  NotificationDto,
  OrderDto,
  OrderItemDto,
  SellerOrderDto,
  PostCommentDto,
  PostDto,
  ProductDto,
  ProductImageDto,
  ReportDto,
  ResumeDocumentDto,
  ResumeDto,
  ResumePublicDto,
  ReviewDto,
  SellerProfileDto,
  TenderBidDto,
  TenderDto,
  VehicleBrandDto,
  VehicleModelDto,
  VehicleType,
  DealerDto,
  GarageVehicleDto,
  UserDto,
  UserRefDto,
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
    fulfillmentStatus: i.fulfillmentStatus,
    createdAt: i.createdAt.toISOString(),
  };
}

/** Ранг «продвинутости» исполнения для агрегата по позициям продавца (наименее продвинутый — представитель). */
/** Группа строк одного заказа (все — одного продавца) → DTO кабинета продавца. */
export function toSellerOrderDto(rows: SellerOrderRow[]): SellerOrderDto {
  const first = rows[0];
  if (!first) throw new Error('toSellerOrderDto: empty rows');
  const items = rows.map(r => ({
    id: r.itemId,
    productId: r.productId,
    nameSnapshot: r.nameSnapshot,
    qty: r.qty,
    price: r.price,
    lineTotal: (Number.parseFloat(r.price) * r.qty).toFixed(2),
    fulfillmentStatus: r.fulfillmentStatus,
  }));
  const subtotal = items.reduce((s, i) => s + Number.parseFloat(i.lineTotal), 0).toFixed(2);
  const fulfillmentStatus = aggregateFulfillment(items.map(i => i.fulfillmentStatus));
  return {
    orderId: first.orderId,
    orderNumber: first.orderNumber,
    orderStatus: first.orderStatus,
    currency: first.currency,
    items,
    subtotal,
    fulfillmentStatus,
    createdAt: first.orderCreatedAt.toISOString(),
  };
}

export function toOrderDto(order: Order, items: OrderItem[]): OrderDto {
  return {
    id: order.id,
    number: order.number,
    buyerId: order.buyerId,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    items: items.map(toOrderItemDto),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toCartDto(lines: CartLine[]): CartDto {
  const items = lines.map(l => {
    const lineTotal = (Number.parseFloat(l.price) * l.qty).toFixed(2);
    return {
      id: l.id,
      productId: l.productId,
      qty: l.qty,
      slug: l.slug,
      nameRu: l.nameRu,
      nameEn: l.nameEn,
      nameZh: l.nameZh,
      price: l.price,
      currency: l.currency,
      imageUrl: l.imageUrl,
      stock: l.stock,
      available: l.status === 'active' && l.stock >= l.qty,
      lineTotal,
      createdAt: l.createdAt.toISOString(),
    };
  });
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalAmount = items.reduce((s, i) => s + Number.parseFloat(i.lineTotal), 0).toFixed(2);
  const currency = items[0]?.currency ?? 'rub';
  return { items, totalQty, totalAmount, currency };
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

export function toResumePublicDto(r: ResumeWithUser): ResumePublicDto {
  return {
    id: r.id,
    position: r.position,
    category: r.category,
    salary: r.salary,
    experience: r.experience,
    skills: r.skills,
    about: r.about,
    hskLevel: r.hskLevel,
    rating: r.rating,
    reviewCount: r.reviewCount,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    candidatePublicId: r.candidatePublicId,
    candidateName: r.candidateName,
    candidateNickname: r.candidateNickname,
    candidateVerified: r.candidateVerified,
  };
}

export function toResumeDocumentDto(d: ResumeDocument): ResumeDocumentDto {
  return {
    id: d.id,
    resumeId: d.resumeId,
    type: d.type,
    fileName: d.fileName,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    verified: d.verifiedAt !== null,
    downloadUrl: `/api/v1/account/resume/documents/${d.id}/download`,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export function toPostDto(p: PostWithAuthor, liked: boolean, apiPublicUrl: string): PostDto {
  return {
    id: p.id,
    body: p.body,
    imageUrls: p.imageKeys.map(key => `${apiPublicUrl}/api/v1/files/social-posts/${p.id}/${key}`),
    status: p.status,
    isAd: p.isAd,
    adUrl: p.adUrl,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    liked,
    author: p.author,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toPostCommentDto(c: CommentWithAuthor): PostCommentDto {
  return {
    id: c.id,
    postId: c.postId,
    body: c.body,
    authorPublicId: c.authorPublicId,
    authorName: c.authorName,
    authorNickname: c.authorNickname,
    authorVerified: c.authorVerified,
    createdAt: c.createdAt.toISOString(),
  };
}

export function toNotificationDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    payload: n.payload,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

export function toReportDto(r: Report): ReportDto {
  return {
    id: r.id,
    reporterId: r.reporterId,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    status: r.status,
    resolvedById: r.resolvedById,
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export function toUserRefDto(u: User): UserRefDto {
  return {
    userId: u.id,
    publicId: u.publicId,
    name: u.name,
    nickname: u.nickname,
    verified: u.verifiedAt !== null,
  };
}

export function toContentAgentDto(a: ContentAgent): ContentAgentDto {
  return {
    id: a.id,
    section: a.section,
    name: a.name,
    persona: a.persona,
    model: a.model,
    topics: a.topics,
    enabled: a.enabled,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function toArticleDto(a: Article): ArticleDto {
  return {
    id: a.id,
    section: a.section,
    agentId: a.agentId,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    coverImageUrl: a.coverImageUrl,
    imagePrompt: a.imagePrompt,
    status: a.status,
    source: a.source,
    authorName: a.authorName,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function toArticleCardDto(a: Article): ArticleCardDto {
  return {
    id: a.id,
    section: a.section,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImageUrl,
    authorName: a.authorName,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
  };
}

export function toArticlePublicDto(a: Article): ArticlePublicDto {
  return { ...toArticleCardDto(a), body: a.body };
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

export function toCompanyRefDto(c: CompanyRef): CompanyRefDto {
  return {
    sellerId: c.sellerId,
    publicId: c.publicId,
    companyName: c.companyName,
    nickname: c.nickname,
    verified: c.verified,
    rating: c.rating,
  };
}

export function toTenderDto(t: TenderWithCustomer): TenderDto {
  return {
    id: t.id,
    registryNumber: t.registryNumber,
    customer: toCompanyRefDto(t.customer),
    title: t.title,
    description: t.description,
    method: t.method,
    law: t.law,
    category: t.category,
    region: t.region,
    deliveryPlace: t.deliveryPlace,
    startPrice: t.startPrice,
    currency: t.currency,
    bidSecurity: t.bidSecurity,
    contractSecurity: t.contractSecurity,
    status: t.status,
    submissionDeadline: t.submissionDeadline.toISOString(),
    publishedAt: t.publishedAt ? t.publishedAt.toISOString() : null,
    awardedBidId: t.awardedBidId,
    awardComment: t.awardComment,
    cancelReason: t.cancelReason,
    bidCount: t.bidCount,
    viewCount: t.viewCount,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toTenderBidDto(b: BidWithBidder): TenderBidDto {
  return {
    id: b.id,
    tenderId: b.tenderId,
    bidder: toCompanyRefDto(b.bidder),
    price: b.price,
    comment: b.comment,
    status: b.status,
    rejectionReason: b.rejectionReason,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function toMyTenderBidDto(b: MyBid): MyTenderBidDto {
  return {
    ...toTenderBidDto(b),
    tenderRegistryNumber: b.tenderRegistryNumber,
    tenderTitle: b.tenderTitle,
    tenderStatus: b.tenderStatus,
  };
}

export function toVehicleBrandDto(b: BrandWithCount): VehicleBrandDto {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    nameZh: b.nameZh,
    country: b.country,
    types: b.types as VehicleType[],
    logoUrl: b.logoUrl,
    popular: b.popular,
    modelCount: b.modelCount,
  };
}

export function toVehicleModelDto(m: VehicleModel): VehicleModelDto {
  return {
    id: m.id,
    brandId: m.brandId,
    slug: m.slug,
    name: m.name,
    type: m.type,
    bodyType: m.bodyType,
    yearFrom: m.yearFrom,
    yearTo: m.yearTo,
    imageUrl: m.imageUrl,
  };
}

export function toDealerDto(d: DealerWithBrands): DealerDto {
  return {
    id: d.id,
    name: d.name,
    city: d.city,
    region: d.region,
    address: d.address,
    phone: d.phone,
    website: d.website,
    lat: Number(d.lat),
    lng: Number(d.lng),
    brands: d.brands,
  };
}

export function toGarageVehicleDto(v: GarageVehicleRow): GarageVehicleDto {
  return {
    id: v.id,
    brandId: v.brandId,
    brandName: v.brandName,
    modelId: v.modelId,
    modelName: v.modelName,
    year: v.year,
    vin: v.vin,
    plate: v.plate,
    type: v.type,
    createdAt: v.createdAt.toISOString(),
  };
}
