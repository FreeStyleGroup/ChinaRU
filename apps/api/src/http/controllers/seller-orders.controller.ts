import { idSchema, ok, updateFulfillmentSchema } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { SellerOrderService } from '../../domain/seller/seller-order.service';
import type { RequestHandler } from 'express';

export interface SellerOrdersController {
  list: RequestHandler;
  setFulfillment: RequestHandler;
}

export function createSellerOrdersController(deps: {
  sellerOrders: SellerOrderService;
}): SellerOrdersController {
  return {
    list: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.sellerOrders.listMyOrders(req.auth.userId)));
    }),

    setFulfillment: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const orderId = idSchema.parse(req.params.orderId);
      const { status } = updateFulfillmentSchema.parse(req.body);
      res.json(ok(await deps.sellerOrders.setFulfillment(req.auth.userId, orderId, status)));
    }),
  };
}
