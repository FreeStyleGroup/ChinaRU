import {
  adminOrderListQuerySchema,
  adminReviewListQuerySchema,
  adminSellerListQuerySchema,
  adminUserListQuerySchema,
  idSchema,
  ok,
  productListQuerySchema,
  reviewModerationSchema,
  sellerVerifyDecisionSchema,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { AdminService } from '../../domain/admin/admin.service';
import type { Request, RequestHandler } from 'express';

export interface AdminController {
  stats: RequestHandler;
  users: RequestHandler;
  sellers: RequestHandler;
  verifySeller: RequestHandler;
  products: RequestHandler;
  orders: RequestHandler;
  reviews: RequestHandler;
  moderateReview: RequestHandler;
}

function actorOf(req: Request): { userId: string; ip: string | null } {
  if (!req.auth) throw new UnauthorizedError();
  return { userId: req.auth.userId, ip: req.ip ?? null };
}

export function createAdminController(deps: { admin: AdminService }): AdminController {
  return {
    stats: asyncHandler(async (_req, res) => {
      res.json(ok(await deps.admin.stats()));
    }),

    users: asyncHandler(async (req, res) => {
      const query = adminUserListQuerySchema.parse(req.query);
      res.json(ok(await deps.admin.listUsers(query)));
    }),

    sellers: asyncHandler(async (req, res) => {
      const query = adminSellerListQuerySchema.parse(req.query);
      res.json(ok(await deps.admin.listSellers(query)));
    }),

    verifySeller: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      const decision = sellerVerifyDecisionSchema.parse(req.body);
      res.json(ok(await deps.admin.verifySeller(id, decision, actorOf(req))));
    }),

    products: asyncHandler(async (req, res) => {
      const query = productListQuerySchema.parse(req.query);
      res.json(ok(await deps.admin.listProducts(query)));
    }),

    orders: asyncHandler(async (req, res) => {
      const query = adminOrderListQuerySchema.parse(req.query);
      res.json(ok(await deps.admin.listOrders(query)));
    }),

    reviews: asyncHandler(async (req, res) => {
      const query = adminReviewListQuerySchema.parse(req.query);
      res.json(ok(await deps.admin.listReviews(query)));
    }),

    moderateReview: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      const input = reviewModerationSchema.parse(req.body);
      res.json(ok(await deps.admin.moderateReview(id, input, actorOf(req))));
    }),
  };
}
