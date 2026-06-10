import { getDb, products, productImages, categories } from '@china-ru/db';
import { eq, and, gte, lte, ilike, desc, asc } from 'drizzle-orm';
import type { ProductDto, ProductListRequest } from '@china-ru/shared';
import { ApiError } from '../../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '@china-ru/shared';

export const productService = {
  list: async (filters: ProductListRequest & { page?: number; limit?: number }) => {
    const db = getDb();
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = db.select().from(products).where(eq(products.status, 'active'));

    if (filters.categoryId) {
      query = query.where(eq(products.categoryId, filters.categoryId));
    }

    if (filters.search) {
      query = query.where(
        ilike(products.nameRu, `%${filters.search}%`)
      );
    }

    if (filters.minPrice) {
      query = query.where(gte(products.price, filters.minPrice.toString()));
    }

    if (filters.maxPrice) {
      query = query.where(lte(products.price, filters.maxPrice.toString()));
    }

    // Sorting
    if (filters.sortBy === 'price_asc') {
      query = query.orderBy(asc(products.price));
    } else if (filters.sortBy === 'price_desc') {
      query = query.orderBy(desc(products.price));
    } else if (filters.sortBy === 'rating') {
      query = query.orderBy(desc(products.rating));
    } else if (filters.sortBy === 'new') {
      query = query.orderBy(desc(products.createdAt));
    }

    const prods = await query.limit(limit).offset(offset);
    const [{ total }] = await db
      .select({ total: () => 'COUNT(*)' } as any)
      .from(products)
      .where(eq(products.status, 'active'));

    return {
      data: prods.map(p => convertToDto(p)),
      total: parseInt(total),
      page,
      limit,
      pages: Math.ceil(parseInt(total) / limit),
    };
  },

  getBySlug: async (slug: string): Promise<ProductDto | null> => {
    const db = getDb();

    const [prod] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);

    if (!prod) return null;

    const images = await db.select().from(productImages).where(eq(productImages.productId, prod.id));

    return {
      ...convertToDto(prod),
      images: images.map(img => ({
        id: img.id,
        url: img.url,
        sort: img.sort || 0,
        isPrimary: img.isPrimary || false,
      })),
    };
  },

  create: async (userId: string, data: any) => {
    const db = getDb();

    // Check seller access
    const [seller] = await db.select().from(require('@china-ru/db').sellerProfiles).where(eq(require('@china-ru/db').sellerProfiles.userId, userId));

    if (!seller) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, 'Must have seller profile');
    }

    // Create product
    const slug = data.nameRu.toLowerCase().replace(/\s+/g, '-').slice(0, 200);

    const [prod] = await db
      .insert(products)
      .values({
        sellerId: userId,
        categoryId: data.categoryId,
        slug,
        sku: data.sku || `SKU-${Date.now()}`,
        nameRu: data.nameRu,
        nameEn: data.nameEn,
        nameZh: data.nameZh,
        descriptionRu: data.descriptionRu,
        descriptionEn: data.descriptionEn,
        descriptionZh: data.descriptionZh,
        price: data.price,
        currency: data.currency || 'rub',
        stock: data.stock,
        status: 'active',
        tags: data.tags || [],
      })
      .returning();

    return convertToDto(prod);
  },

  update: async (userId: string, productId: string, data: any) => {
    const db = getDb();

    // Check ownership
    const [prod] = await db.select().from(products).where(eq(products.id, productId));

    if (!prod || prod.sellerId !== userId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, 'Not authorized');
    }

    const [updated] = await db
      .update(products)
      .set({
        nameRu: data.nameRu || prod.nameRu,
        nameEn: data.nameEn || prod.nameEn,
        nameZh: data.nameZh || prod.nameZh,
        descriptionRu: data.descriptionRu,
        descriptionEn: data.descriptionEn,
        descriptionZh: data.descriptionZh,
        price: data.price || prod.price,
        stock: data.stock !== undefined ? data.stock : prod.stock,
        status: data.status || prod.status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    return convertToDto(updated);
  },
};

function convertToDto(p: any): ProductDto {
  return {
    id: p.id,
    sellerId: p.sellerId,
    categoryId: p.categoryId,
    slug: p.slug,
    nameRu: p.nameRu,
    nameEn: p.nameEn,
    nameZh: p.nameZh,
    descriptionRu: p.descriptionRu,
    descriptionEn: p.descriptionEn,
    descriptionZh: p.descriptionZh,
    status: p.status,
    price: parseFloat(p.price),
    currency: p.currency,
    stock: p.stock,
    rating: parseFloat(p.rating),
    reviewCount: p.reviewCount || 0,
    images: [],
    tags: p.tags || [],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
