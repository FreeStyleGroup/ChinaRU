import { Router } from 'express';
import { ordersController } from '../controllers/orders.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';

export function createOrdersRoutes(): Router {
  const router = Router();

  // Orders
  router.post('/', requireAuth, asyncHandler(ordersController.create));
  router.get('/my-orders', requireAuth, asyncHandler(ordersController.listMyOrders));
  router.get('/:id', requireAuth, asyncHandler(ordersController.getById));
  router.get('/public/:publicId', requireAuth, asyncHandler(ordersController.getByPublicId));
  router.put('/:id/status', requireAuth, asyncHandler(ordersController.updateStatus));

  // Reviews
  router.post('/:productId/reviews', requireAuth, asyncHandler(ordersController.createReview));
  router.get('/:productId/reviews', asyncHandler(ordersController.getProductReviews));
  router.post('/:reviewId/approve', requireAuth, asyncHandler(ordersController.approveReview));

  return router;
}
