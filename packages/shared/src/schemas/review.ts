import { z } from 'zod';

import { idSchema, ratingValueSchema, timestampsShape } from '../common';
import { reviewStatusSchema } from '../enums';

import { publicUserDtoSchema } from './user';

/** Создание отзыва покупателем на товар. */
export const createReviewSchema = z.object({
  productId: idSchema,
  rating: ratingValueSchema,
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(5000),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/** Решение модератора по отзыву (admin). */
export const reviewModerationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});
export type ReviewModerationInput = z.infer<typeof reviewModerationSchema>;

export const reviewDtoSchema = z.object({
  id: idSchema,
  productId: idSchema,
  sellerId: idSchema,
  rating: z.number().int(),
  title: z.string().nullable(),
  body: z.string(),
  status: reviewStatusSchema,
  author: publicUserDtoSchema,
  ...timestampsShape,
});
export type ReviewDto = z.infer<typeof reviewDtoSchema>;
