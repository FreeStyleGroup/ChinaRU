import { ACCESS_COOKIE } from '../cookies';
import { UnauthorizedError } from '../errors';

import type { AuthService } from '../../domain/auth/auth.service';
import type { TokenService } from '../../domain/auth/token.service';
import type { Request, RequestHandler } from 'express';

function extractToken(req: Request): string | null {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  return cookies[ACCESS_COOKIE] ?? null;
}

export interface AuthMiddleware {
  /** Жёсткий гард: нет валидного токена / юзер забанен → 401. */
  requireAuth: RequestHandler;
  /** Мягкий: парсит токен если есть, иначе пропускает гостя. */
  optionalAuth: RequestHandler;
}

export function createAuthMiddleware(deps: {
  tokens: TokenService;
  auth: AuthService;
}): AuthMiddleware {
  const load = async (req: Request, token: string): Promise<boolean> => {
    const payload = deps.tokens.verifyAccess(token);
    const user = await deps.auth.getById(payload.sub);
    if (!user || user.status === 'banned') return false;
    req.auth = { userId: user.id, role: user.role };
    req.user = user;
    return true;
  };

  return {
    requireAuth: (req, _res, next) => {
      const token = extractToken(req);
      if (!token) {
        next(new UnauthorizedError());
        return;
      }
      load(req, token)
        .then(okOrNot => {
          next(okOrNot ? undefined : new UnauthorizedError());
        })
        .catch(() => {
          next(new UnauthorizedError());
        });
    },

    optionalAuth: (req, _res, next) => {
      const token = extractToken(req);
      if (!token) {
        next();
        return;
      }
      load(req, token)
        .catch(() => false)
        .then(() => {
          next();
        })
        .catch(() => {
          next();
        });
    },
  };
}
