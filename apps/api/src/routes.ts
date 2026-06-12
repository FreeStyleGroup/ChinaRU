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
  const { auth, catalog, orders, admin, account, jobs, referral, content } =
    container.controllers;
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

  // ───────── контент (публичное чтение): блок новостей + статьи разделов ─────────
  router.get('/content/articles', content.listArticles);
  router.get('/content/articles/:slug', content.getArticle);

  // ───────── account (кабинет) ─────────
  router.patch('/account/profile', requireAuth, account.updateProfile);
  router.put('/account/menu', requireAuth, account.updateMenu);
  router.put('/account/nickname', requireAuth, account.setNickname);
  router.get('/account/seller', requireAuth, account.getSeller);
  router.post('/account/seller/apply', requireAuth, account.applySeller);
  router.put('/account/seller/nickname', requireAuth, account.setSellerNickname);
  router.get('/account/referral', requireAuth, referral.summary);

  // ───────── работа (резюме / вакансии / отклики) ─────────
  router.get('/account/resume', requireAuth, jobs.getResume);
  router.put('/account/resume', requireAuth, jobs.upsertResume);
  router.get('/account/applications', requireAuth, jobs.myApplications);
  router.get('/jobs', jobs.listVacancies);
  router.get('/jobs/categories', jobs.categoryCounts);
  // Статические сегменты строго до параметрического '/jobs/:id'.
  router.get('/jobs/resumes', jobs.listPublicResumes);
  router.get('/jobs/resumes/:id', jobs.getPublicResume);
  router.get('/jobs/:id', jobs.getVacancy);
  router.post('/jobs/:id/apply', requireAuth, jobs.apply);
  router.get('/seller/vacancies', requireAuth, jobs.myVacancies);
  router.post('/seller/vacancies', requireAuth, jobs.createVacancy);
  router.get('/seller/vacancies/:id/applicants', requireAuth, jobs.listingApplicants);
  router.put('/seller/applications/:id', requireAuth, jobs.setApplicationStatus);

  // ───────── orders (покупатель) ─────────
  router.get('/orders', requireAuth, orders.list);
  router.post('/orders', requireAuth, orders.create);
  router.get('/orders/:id', requireAuth, orders.get);

  // ───────── admin (только роль admin) ─────────
  const onlyAdmin = [requireAuth, requireRole('admin')];
  router.get('/admin/stats', onlyAdmin, admin.stats);
  router.get('/admin/users', onlyAdmin, admin.users);
  router.post('/admin/users/:id/verify', onlyAdmin, admin.verifyUser);
  router.get('/admin/sellers', onlyAdmin, admin.sellers);
  router.post('/admin/sellers/:id/verify', onlyAdmin, admin.verifySeller);
  router.get('/admin/products', onlyAdmin, admin.products);
  router.get('/admin/orders', onlyAdmin, admin.orders);
  router.get('/admin/reviews', onlyAdmin, admin.reviews);
  router.post('/admin/reviews/:id/moderate', onlyAdmin, admin.moderateReview);
  router.get('/admin/resumes', onlyAdmin, admin.resumes);
  router.post('/admin/resumes/:id/moderate', onlyAdmin, admin.moderateResume);
  router.get('/admin/vacancies', onlyAdmin, admin.vacancies);
  router.post('/admin/vacancies/:id/moderate', onlyAdmin, admin.moderateVacancy);

  // ───────── admin: Контент завод (агенты + статьи) ─────────
  router.get('/admin/content/agents', onlyAdmin, content.listAgents);
  router.put('/admin/content/agents/:section', onlyAdmin, content.upsertAgent);
  router.post('/admin/content/agents/:section/generate', onlyAdmin, content.generate);
  router.get('/admin/content/articles', onlyAdmin, content.adminListArticles);
  router.get('/admin/content/articles/:id', onlyAdmin, content.adminGetArticle);
  router.post('/admin/content/articles', onlyAdmin, content.createArticle);
  router.patch('/admin/content/articles/:id', onlyAdmin, content.updateArticle);
  router.post('/admin/content/articles/:id/publish', onlyAdmin, content.publishArticle);
  router.post('/admin/content/articles/:id/archive', onlyAdmin, content.archiveArticle);
  router.delete('/admin/content/articles/:id', onlyAdmin, content.deleteArticle);

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
