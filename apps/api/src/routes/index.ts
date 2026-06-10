import { Router } from 'express';
import { createAuthRoutes } from './auth.routes';
import { createCatalogRoutes } from './catalog.routes';
import { createOrdersRoutes } from './orders.routes';
import { createTravelRoutes } from './travel.routes';
import { createJobsRoutes } from './jobs.routes';

export function createApiRouter(): Router {
  const router = Router();

  // Health
  router.get('/health', (req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes
  router.use('/auth', createAuthRoutes());

  // Catalog routes
  router.use('/catalog', createCatalogRoutes());

  // Orders routes
  router.use('/orders', createOrdersRoutes());

  // Travel routes
  router.use('/travel', createTravelRoutes());

  // Jobs routes
  router.use('/jobs', createJobsRoutes());

  // Search routes (will be added)
  // router.use('/search', searchRoutes);

  // Seller routes (will be added)
  // router.use('/seller', sellerRoutes);

  // Metro routes (will be added)
  // router.use('/metro', metroRoutes);

  return router;
}
