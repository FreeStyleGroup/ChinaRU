import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/asyncHandler';

export function createAuthRoutes(): Router {
  const router = Router();

  router.post('/register', asyncHandler(authController.register));
  router.post('/login', asyncHandler(authController.login));
  router.post('/refresh', asyncHandler(authController.refresh));
  router.post('/logout', asyncHandler(authController.logout));
  router.get('/verify-email', asyncHandler(authController.verifyEmail));
  router.post('/forgot-password', asyncHandler(authController.forgotPassword));
  router.post('/reset-password', asyncHandler(authController.resetPassword));

  return router;
}
