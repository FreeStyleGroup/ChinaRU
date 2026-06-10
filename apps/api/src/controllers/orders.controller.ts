import { Request, Response } from 'express';
import { orderService } from '../services/orders/order.service';
import { reviewService } from '../services/orders/review.service';
import { asyncHandler } from '../middleware/asyncHandler';

export const ordersController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const result = await orderService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const order = await orderService.getById(req.params.id, req.user.id);
    res.json({ success: true, data: order });
  }),

  getByPublicId: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const order = await orderService.getByPublicId(req.params.publicId, req.user.id);
    res.json({ success: true, data: order });
  }),

  listMyOrders: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const orders = await orderService.listByBuyer(req.user.id, page, limit);
    res.json({ success: true, data: orders });
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const order = await orderService.updateStatus(req.params.id, req.body.status, req.user.id);
    res.json({ success: true, data: order });
  }),

  createReview: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const review = await reviewService.create(req.user.id, req.params.productId, req.body.sellerId, req.body);
    res.status(201).json({ success: true, data: review });
  }),

  getProductReviews: asyncHandler(async (req: Request, res: Response) => {
    const reviews = await reviewService.getByProduct(req.params.productId, true);
    res.json({ success: true, data: reviews });
  }),

  approveReview: asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewService.approve(req.params.reviewId);
    res.json({ success: true, data: review });
  }),
};
