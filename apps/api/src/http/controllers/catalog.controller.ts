import { ok, productListQuerySchema } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';

import type { CatalogService } from '../../domain/catalog/catalog.service';
import type { RequestHandler } from 'express';

export interface CatalogController {
  categoryTree: RequestHandler;
  listProducts: RequestHandler;
  getProduct: RequestHandler;
}

export function createCatalogController(deps: { catalog: CatalogService }): CatalogController {
  return {
    categoryTree: asyncHandler(async (_req, res) => {
      res.json(ok(await deps.catalog.categoryTree()));
    }),

    listProducts: asyncHandler(async (req, res) => {
      const query = productListQuerySchema.parse(req.query);
      res.json(ok(await deps.catalog.listProducts(query)));
    }),

    getProduct: asyncHandler(async (req, res) => {
      const raw = req.params.slug;
      const slug = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
      res.json(ok(await deps.catalog.getProductBySlug(slug)));
    }),
  };
}
