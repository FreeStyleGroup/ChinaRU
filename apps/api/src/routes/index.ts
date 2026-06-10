import { Router } from 'express';

export function createApiRouter(): Router {
  const router = Router();

  // Health
  router.get('/health', (req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes (will be added)
  // router.use('/auth', authRoutes);

  // Catalog routes (will be added)
  // router.use('/catalog', catalogRoutes);

  // Search routes (will be added)
  // router.use('/search', searchRoutes);

  // Orders routes (will be added)
  // router.use('/orders', orderRoutes);

  // Seller routes (will be added)
  // router.use('/seller', sellerRoutes);

  // Travel routes (will be added)
  // router.use('/travel', travelRoutes);

  // Jobs routes (will be added)
  // router.use('/jobs', jobRoutes);

  // Metro routes (will be added)
  // router.use('/metro', metroRoutes);

  return router;
}
