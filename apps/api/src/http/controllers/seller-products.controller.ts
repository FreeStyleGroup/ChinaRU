import { createProductSchema, idSchema, ok, updateProductSchema } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { BadRequestError, UnauthorizedError } from '../errors';

import type { SellerProductService } from '../../domain/seller/seller-product.service';
import type { RequestHandler } from 'express';

export interface SellerProductsController {
  list: RequestHandler;
  create: RequestHandler;
  get: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  addImage: RequestHandler;
  removeImage: RequestHandler;
}

export function createSellerProductsController(deps: {
  sellerProducts: SellerProductService;
}): SellerProductsController {
  return {
    list: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.sellerProducts.listMyProducts(req.auth.userId)));
    }),

    create: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = createProductSchema.parse(req.body);
      res.status(201).json(ok(await deps.sellerProducts.createProduct(req.auth.userId, input)));
    }),

    get: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.sellerProducts.getMyProduct(req.auth.userId, id)));
    }),

    update: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = updateProductSchema.parse(req.body);
      res.json(ok(await deps.sellerProducts.updateProduct(req.auth.userId, id, input)));
    }),

    remove: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.sellerProducts.deleteProduct(req.auth.userId, id)));
    }),

    addImage: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      if (!req.file) throw new BadRequestError('Файл не передан', 'file_required');
      res
        .status(201)
        .json(ok(await deps.sellerProducts.addImage(req.auth.userId, id, req.file)));
    }),

    removeImage: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const imageId = idSchema.parse(req.params.imageId);
      res.json(ok(await deps.sellerProducts.deleteImage(req.auth.userId, id, imageId)));
    }),
  };
}
