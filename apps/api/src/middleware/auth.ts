import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config$ } from '../config';
import { ApiError } from './errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '@china-ru/shared';
import type { AccessTokenPayload } from '@china-ru/shared';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload & { id: string };
      userId?: string;
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies.fs_access;

  if (!token) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
      'Missing access token'
    );
  }

  try {
    const decoded = jwt.verify(token, config$.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (decoded.type !== 'access') {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_TOKEN,
        'Invalid token type'
      );
    }

    req.user = { ...decoded, id: decoded.sub };
    req.userId = decoded.sub;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_EXPIRED,
        'Access token expired'
      );
    }

    if (error instanceof ApiError) throw error;

    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.INVALID_TOKEN,
      'Invalid token'
    );
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies.fs_access;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config$.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (decoded.type === 'access') {
      req.user = { ...decoded, id: decoded.sub };
      req.userId = decoded.sub;
    }
  } catch {
    // Ignore errors in optional auth
  }

  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        'Authentication required'
      );
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        'Insufficient permissions'
      );
    }

    next();
  };
};
