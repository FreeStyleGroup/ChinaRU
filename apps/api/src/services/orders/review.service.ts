import { getDb, reviews } from '@china-ru/db';
import { eq, and } from 'drizzle-orm';
import { ApiError } from '../../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '@china-ru/shared';
import type { TravelReviewDto } from '@china-ru/shared';

export const reviewService = {
  create: async (userId: string, productId: string, sellerId: string, data: any) => {
    const db = getDb();

    // Check if already reviewed
    const [existing] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.authorId, userId)))
      .limit(1);

    if (existing) {
      throw new ApiError(HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, 'Already reviewed this product');
    }

    const [review] = await db
      .insert(reviews)
      .values({
        productId,
        sellerId,
        authorId: userId,
        rating: Math.min(5, Math.max(1, data.rating)),
        title: data.title,
        text: data.text,
        status: 'pending', // Needs moderation
        images: data.images || [],
      })
      .returning();

    return convertToDto(review);
  },

  getByProduct: async (productId: string, approved = true) => {
    const db = getDb();

    const query = db.select().from(reviews).where(eq(reviews.productId, productId));

    if (approved) {
      query.where(eq(reviews.status, 'approved'));
    }

    const revs = await query;
    return revs.map(convertToDto);
  },

  approve: async (reviewId: string) => {
    const db = getDb();

    const [updated] = await db
      .update(reviews)
      .set({ status: 'approved' })
      .where(eq(reviews.id, reviewId))
      .returning();

    return convertToDto(updated);
  },

  reject: async (reviewId: string) => {
    const db = getDb();

    const [updated] = await db
      .update(reviews)
      .set({ status: 'rejected' })
      .where(eq(reviews.id, reviewId))
      .returning();

    return convertToDto(updated);
  },
};

function convertToDto(r: any): TravelReviewDto {
  return {
    id: r.id,
    packageId: r.productId, // Reuse for products
    authorId: r.authorId,
    authorName: 'User', // TODO: Fetch actual user name
    rating: r.rating,
    text: r.text || '',
    images: r.images || [],
    createdAt: r.createdAt.toISOString(),
  };
}
