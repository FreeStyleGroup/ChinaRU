import { createReviewSchema, idSchema, ok } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { ReviewService } from '../../domain/catalog/review.service';
import type { RequestHandler } from 'express';

export interface ReviewsController {
  listForProduct: RequestHandler;
  create: RequestHandler;
}

export function createReviewsController(deps: { reviews: ReviewService }): ReviewsController {
  return {
    listForProduct: asyncHandler(async (req, res) => {
      const productId = idSchema.parse(req.params.id);
      res.json(ok(await deps.reviews.listForProduct(productId)));
    }),

    create: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const productId = idSchema.parse(req.params.id);
      // productId берётся из URL, остальное — из тела.
      const input = createReviewSchema.parse({ ...req.body, productId });
      const review = await deps.reviews.createReview(req.auth.userId, input);
      res.status(201).json(ok(review));
    }),
  };
}
