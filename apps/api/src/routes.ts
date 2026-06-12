import { ok } from '@china-ru/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { requireRole } from './http/middleware/require-role';
import { openApiDocument } from './openapi/spec';

import type { AppConfig } from './config';
import type { Container } from './container';

/** Строит роутер /api/v1 из собранного контейнера. */
export function createV1Router(container: Container, config: AppConfig): Router {
  const router = Router();
  const { auth, catalog, orders, admin, account } = container.controllers;
  const { requireAuth } = container.authMiddleware;

  // Усиленный лимит на чувствительные auth-эндпоинты (брутфорс/перебор).
  const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  // ───────── auth ─────────
  router.post('/auth/register', authLimiter, auth.register);
  router.post('/auth/login', authLimiter, auth.login);
  router.post('/auth/refresh', auth.refresh);
  router.post('/auth/logout', auth.logout);
  router.get('/auth/me', requireAuth, auth.me);
  router.post('/auth/verify-email', auth.verifyEmail);
  router.post('/auth/password-reset/request', authLimiter, auth.requestPasswordReset);
  router.post('/auth/password-reset/confirm', authLimiter, auth.resetPassword);
  router.post('/auth/change-password', requireAuth, auth.changePassword);

  // ───────── catalog (публичное чтение) ─────────
  router.get('/catalog/categories', catalog.categoryTree);
  router.get('/catalog/products', catalog.listProducts);
  router.get('/catalog/products/:slug', catalog.getProduct);

  // ───────── account (кабинет) ─────────
  router.patch('/account/profile', requireAuth, account.updateProfile);
  router.put('/account/menu', requireAuth, account.updateMenu);

  // ───────── orders (покупатель) ─────────
  router.get('/orders', requireAuth, orders.list);
  router.post('/orders', requireAuth, orders.create);
  router.get('/orders/:id', requireAuth, orders.get);

  // ───────── admin (только роль admin) ─────────
  const onlyAdmin = [requireAuth, requireRole('admin')];
  router.get('/admin/stats', onlyAdmin, admin.stats);
  router.get('/admin/users', onlyAdmin, admin.users);
  router.get('/admin/sellers', onlyAdmin, admin.sellers);
  router.post('/admin/sellers/:id/verify', onlyAdmin, admin.verifySeller);
  router.get('/admin/products', onlyAdmin, admin.products);
  router.get('/admin/orders', onlyAdmin, admin.orders);
  router.get('/admin/reviews', onlyAdmin, admin.reviews);
  router.post('/admin/reviews/:id/moderate', onlyAdmin, admin.moderateReview);

  return router;
}

/** /api/health — лёгкий liveness без зависимостей. */
export function healthRouter(): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json(ok({ status: 'ok', service: 'api' }));
  });
  return router;
}
