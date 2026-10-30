import { z } from 'zod';

import { idSchema, moneyString, phoneSchema, slugSchema, timestampsShape } from '../common';
import { currencySchema, priceRequestStatusSchema, productStatusSchema } from '../enums';
import { paginationQuerySchema } from '../pagination';

/* ─────────────────────────── Категории ─────────────────────────── */

export const createCategorySchema = z.object({
  parentId: idSchema.nullable().optional(),
  slug: slugSchema,
  nameRu: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).optional(),
  nameZh: z.string().trim().max(200).optional(),
  descriptionRu: z.string().trim().max(2000).optional(),
  descriptionEn: z.string().trim().max(2000).optional(),
  descriptionZh: z.string().trim().max(2000).optional(),
  sort: z.number().int().min(0).optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryDtoSchema = z.object({
  id: idSchema,
  parentId: idSchema.nullable(),
  slug: z.string(),
  nameRu: z.string(),
  nameEn: z.string().nullable(),
  nameZh: z.string().nullable(),
  descriptionRu: z.string().nullable(),
  descriptionEn: z.string().nullable(),
  descriptionZh: z.string().nullable(),
  /** Обложка раздела (абсолютный адрес) или null. */
  imageUrl: z.string().nullable(),
  depth: z.number().int(),
  sort: z.number().int(),
  ...timestampsShape,
});
export type CategoryDto = z.infer<typeof categoryDtoSchema>;

/** Узел дерева категорий (для эндпоинта дерева). */
export interface CategoryTreeNode extends CategoryDto {
  /** Активных товаров в разделе и всех его подразделах. */
  productCount: number;
  children: CategoryTreeNode[];
}

/* ─────────────────────────── Характеристики ─────────────────────────── */

/** Строка характеристик товара «название — значение». */
export const productSpecSchema = z.object({
  name: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(500),
});
export type ProductSpec = z.infer<typeof productSpecSchema>;

export const productSpecsSchema = z.array(productSpecSchema).max(40);

/* ─────────────────────────── Товары ─────────────────────────── */

const productBaseSchema = z.object({
  categoryId: idSchema,
  slug: slugSchema,
  sku: z.string().trim().min(1).max(80),
  nameRu: z.string().trim().min(1).max(300),
  nameEn: z.string().trim().max(300).optional(),
  nameZh: z.string().trim().max(300).optional(),
  descriptionRu: z.string().trim().max(20000).optional(),
  descriptionEn: z.string().trim().max(20000).optional(),
  descriptionZh: z.string().trim().max(20000).optional(),
  /** Цена; null — «цена по запросу» (покупатель отправляет запрос цены продавцу). */
  price: moneyString.nullable(),
  currency: currencySchema.optional(),
  stock: z.number().int().min(0),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  specs: productSpecsSchema.optional(),
});

/** Создание товара продавцом. */
export const createProductSchema = productBaseSchema;
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Подсказка перевода названия товара в форме продавца (EN и 中文 из русского). */
export const translateProductNameSchema = z.object({
  nameRu: z.string().trim().min(1).max(300),
});
export type TranslateProductNameInput = z.infer<typeof translateProductNameSchema>;

export interface ProductNameTranslationDto {
  nameEn: string;
  nameZh: string;
  /** false — ИИ на сервере не настроен, переводить нечем (поля остаются пустыми). */
  available: boolean;
}

/** Редактирование товара (PATCH). */
export const updateProductSchema = productBaseSchema
  .partial()
  .extend({ status: productStatusSchema.optional() });
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** Сортировки листинга каталога. */
export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'rating'] as const;
export const productSortSchema = z.enum(PRODUCT_SORTS);
export type ProductSort = z.infer<typeof productSortSchema>;

/** Фильтры и пагинация листинга каталога (query-string → coerce). */
export const productListQuerySchema = paginationQuerySchema.extend({
  categoryId: idSchema.optional(),
  sellerId: idSchema.optional(),
  status: productStatusSchema.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sort: productSortSchema.default('newest'),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productImageDtoSchema = z.object({
  id: idSchema,
  url: z.string(),
  sort: z.number().int(),
  isPrimary: z.boolean(),
});
export type ProductImageDto = z.infer<typeof productImageDtoSchema>;

export const productDtoSchema = z.object({
  id: idSchema,
  sellerId: idSchema,
  categoryId: idSchema,
  slug: z.string(),
  sku: z.string(),
  nameRu: z.string(),
  nameEn: z.string().nullable(),
  nameZh: z.string().nullable(),
  descriptionRu: z.string().nullable(),
  descriptionEn: z.string().nullable(),
  descriptionZh: z.string().nullable(),
  /** null — «цена по запросу». */
  price: z.string().nullable(),
  currency: currencySchema,
  stock: z.number().int(),
  status: productStatusSchema,
  rating: z.string(),
  reviewCount: z.number().int(),
  tags: z.array(z.string()),
  specs: z.array(productSpecSchema),
  images: z.array(productImageDtoSchema),
  ...timestampsShape,
});
export type ProductDto = z.infer<typeof productDtoSchema>;

/* ─────────────────────────── Магазин продавца ─────────────────────────── */

/**
 * Публичная страница магазина. Без контактов и реквизитов заявки — их видит
 * только модератор; покупатель связывается через запрос цены и заказ.
 */
export const storeDtoSchema = z.object({
  id: idSchema,
  publicId: z.number().int(),
  nickname: z.string().nullable(),
  companyName: z.string(),
  companyNameZh: z.string().nullable(),
  description: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  logoUrl: z.string().nullable(),
  rating: z.string(),
  reviewCount: z.number().int(),
  verified: z.boolean(),
  productCount: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type StoreDto = z.infer<typeof storeDtoSchema>;

/** Оформление магазина продавцом (текст; баннер и логотип — отдельной загрузкой файла). */
export const updateStoreSchema = z.object({
  description: z.string().trim().max(4000).nullable(),
});
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

/* ─────────────────────────── Запрос цены ─────────────────────────── */

/** Запрос цены покупателем по товару без цены. */
export const createPriceRequestSchema = z.object({
  qty: z.number().int().min(1).max(1_000_000).default(1),
  comment: z.string().trim().max(2000).optional(),
  contactPhone: phoneSchema.optional(),
});
export type CreatePriceRequestInput = z.input<typeof createPriceRequestSchema>;

/** Смена статуса запроса продавцом. */
export const updatePriceRequestSchema = z.object({ status: priceRequestStatusSchema });
export type UpdatePriceRequestInput = z.infer<typeof updatePriceRequestSchema>;

export const priceRequestListQuerySchema = paginationQuerySchema.extend({
  status: priceRequestStatusSchema.optional(),
});
export type PriceRequestListQuery = z.infer<typeof priceRequestListQuerySchema>;

/** Запрос цены в кабинете продавца: товар и контакты покупателя. */
export const priceRequestDtoSchema = z.object({
  id: idSchema,
  status: priceRequestStatusSchema,
  qty: z.number().int(),
  comment: z.string().nullable(),
  contactPhone: z.string().nullable(),
  product: z.object({ id: idSchema, slug: z.string(), nameRu: z.string() }),
  buyer: z.object({ name: z.string().nullable(), email: z.string() }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type PriceRequestDto = z.infer<typeof priceRequestDtoSchema>;

/* ─────────────────────────── Изображения товара ─────────────────────────── */

export const addProductImageSchema = z.object({
  url: z.url({ error: 'Некорректная ссылка на изображение' }).max(2048),
  sort: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
});
export type AddProductImageInput = z.infer<typeof addProductImageSchema>;
