import { Router } from 'express';
import { catalogController } from '../controllers/catalog.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';

export function createCatalogRoutes(): Router {
  const router = Router();

  // Categories
  router.get('/categories', asyncHandler(catalogController.categories));
  router.get('/categories/tree', asyncHandler(catalogController.categoriesTree));
  router.get('/categories/:slug', asyncHandler(catalogController.categoryBySlug));

  // Products
  router.get('/products', asyncHandler(catalogController.products));
  router.get('/products/:slug', asyncHandler(catalogController.productBySlug));
  router.post('/products', requireAuth, asyncHandler(catalogController.createProduct));
  router.put('/products/:id', requireAuth, asyncHandler(catalogController.updateProduct));

  return router;
}
