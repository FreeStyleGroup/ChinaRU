import { ForbiddenError, UnauthorizedError } from '../errors';

import type { UserRole } from '@china-ru/shared';
import type { RequestHandler } from 'express';

/**
 * RBAC: пропускает только указанные роли. Ставится ПОСЛЕ requireAuth.
 *   router.post('/products', requireAuth, requireRole('seller', 'admin'), handler)
 */
export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new UnauthorizedError());
      return;
    }
    if (!allowed.includes(req.auth.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
