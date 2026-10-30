import {
  createPriceRequestSchema,
  idSchema,
  ok,
  priceRequestListQuerySchema,
  updatePriceRequestSchema,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { PriceRequestService } from '../../domain/store/price-request.service';
import type { RequestHandler } from 'express';

export interface PriceRequestsController {
  /** Покупатель: запрос цены по товару «по запросу». */
  create: RequestHandler;
  /** Продавец: входящие запросы цены. */
  listForSeller: RequestHandler;
  /** Продавец: статус запроса (ответил / закрыт). */
  setStatus: RequestHandler;
}

export function createPriceRequestsController(deps: {
  priceRequests: PriceRequestService;
}): PriceRequestsController {
  return {
    create: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const productId = idSchema.parse(req.params.id);
      const input = createPriceRequestSchema.parse(req.body);
      const created = await deps.priceRequests.create(req.auth.userId, productId, input);
      res.status(201).json(ok(created));
    }),

    listForSeller: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const query = priceRequestListQuerySchema.parse(req.query);
      res.json(ok(await deps.priceRequests.listForSeller(req.auth.userId, query)));
    }),

    setStatus: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const { status } = updatePriceRequestSchema.parse(req.body);
      res.json(ok(await deps.priceRequests.setStatus(req.auth.userId, id, status)));
    }),
  };
}
