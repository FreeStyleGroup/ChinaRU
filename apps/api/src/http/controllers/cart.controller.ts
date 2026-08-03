import { addToCartSchema, idSchema, ok, updateCartItemSchema } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { CartService } from '../../domain/cart/cart.service';
import type { RequestHandler } from 'express';

export interface CartController {
  get: RequestHandler;
  add: RequestHandler;
  updateItem: RequestHandler;
  remove: RequestHandler;
  clear: RequestHandler;
  checkout: RequestHandler;
}

export function createCartController(deps: { cart: CartService }): CartController {
  return {
    get: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.cart.getCart(req.auth.userId)));
    }),

    add: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = addToCartSchema.parse(req.body);
      res.status(201).json(ok(await deps.cart.addItem(req.auth.userId, input)));
    }),

    updateItem: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const { qty } = updateCartItemSchema.parse(req.body);
      res.json(ok(await deps.cart.updateItem(req.auth.userId, id, qty)));
    }),

    remove: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.cart.removeItem(req.auth.userId, id)));
    }),

    clear: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.cart.clear(req.auth.userId)));
    }),

    checkout: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.status(201).json(ok(await deps.cart.checkout(req.auth.userId)));
    }),
  };
}
