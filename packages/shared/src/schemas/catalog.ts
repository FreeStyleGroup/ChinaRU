import { z } from 'zod';

import { idSchema, moneyString, slugSchema, timestampsShape } from '../common';
import { currencySchema, productStatusSchema } from '../enums';
import { paginationQuerySchema } from '../pagination';

/* ─────────────────────────── Категории ─────────────────────────── */

export const createCategorySchema = z.object({
  parentId: idSchema.nullable().optional(),
  slug: slugSchema,
  nameRu: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).optional(),
  nameZh: z.string().trim().max(200).optional(),
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
  depth: z.number().int(),
  sort: z.number().int(),
  ...timestampsShape,
});
export type CategoryDto = z.infer<typeof categoryDtoSchema>;

/** Узел дерева категорий (для эндпоинта дерева). */
export interface CategoryTreeNode extends CategoryDto {
  children: CategoryTreeNode[];
}

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
  price: moneyString,
  currency: currencySchema.optional(),
  stock: z.number().int().min(0),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
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
  price: z.string(),
  currency: currencySchema,
  stock: z.number().int(),
  status: productStatusSchema,
  rating: z.string(),
  reviewCount: z.number().int(),
  tags: z.array(z.string()),
  images: z.array(productImageDtoSchema),
  ...timestampsShape,
});
export type ProductDto = z.infer<typeof productDtoSchema>;

/* ─────────────────────────── Изображения товара ─────────────────────────── */

export const addProductImageSchema = z.object({
  url: z.url({ error: 'Некорректная ссылка на изображение' }).max(2048),
  sort: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
});
export type AddProductImageInput = z.infer<typeof addProductImageSchema>;
