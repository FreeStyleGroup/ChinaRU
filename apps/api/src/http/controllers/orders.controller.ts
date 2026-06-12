import { createOrderSchema, idSchema, ok } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { OrderService } from '../../domain/orders/order.service';
import type { RequestHandler } from 'express';

export interface OrdersController {
  create: RequestHandler;
  list: RequestHandler;
  get: RequestHandler;
}

export function createOrdersController(deps: { orders: OrderService }): OrdersController {
  return {
    create: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = createOrderSchema.parse(req.body);
      const order = await deps.orders.create(req.auth.userId, input);
      res.status(201).json(ok(order));
    }),

    list: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.orders.listForBuyer(req.auth.userId)));
    }),

    get: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.orders.getForBuyer(id, req.auth.userId)));
    }),
  };
}
