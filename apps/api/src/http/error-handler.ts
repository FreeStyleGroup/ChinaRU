import { OrderError } from '@china-ru/db';
import { err, fieldErrors } from '@china-ru/shared';
import { ZodError } from 'zod';

import { AppError } from './errors';

import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';

const ORDER_ERROR_STATUS: Record<OrderError['code'], number> = {
  empty_order: 400,
  product_unavailable: 409,
  insufficient_stock: 409,
};

/**
 * Единый обработчик ошибок: любую ошибку приводит к конверту `ApiResponse.err`.
 * Доменные ошибки (AppError, ZodError, OrderError) → осмысленный статус;
 * всё непредвиденное → 500 без утечки деталей наружу (детали — только в лог).
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, _req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.status).json(err(error.code, error.message, error.fields));
      return;
    }

    if (error instanceof ZodError) {
      res.status(422).json(err('validation', 'Ошибка валидации', fieldErrors(error)));
      return;
    }

    if (error instanceof OrderError) {
      res.status(ORDER_ERROR_STATUS[error.code]).json(err(error.code, error.message));
      return;
    }

    logger.error({ err: error }, 'Unhandled error');
    res.status(500).json(err('internal', 'Внутренняя ошибка сервера'));
  };
}
