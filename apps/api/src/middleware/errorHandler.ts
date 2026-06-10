import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { HTTP_STATUS, ERROR_CODES } from '@china-ru/shared';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({ error }, 'Error handler');

  if (error instanceof ZodError) {
    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      error: 'Validation error',
      details: error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      error: error.message,
    });
  }

  if (error instanceof Error) {
    logger.error(error.message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      error: 'Internal server error',
    });
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    code: ERROR_CODES.INTERNAL_ERROR,
    error: 'Unknown error',
  });
};
