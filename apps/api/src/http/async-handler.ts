import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Оборачивает async-контроллер так, чтобы отклонённый промис уходил в errorHandler.
 * (Express 5 ловит async-ошибки сам, но обёртка делает намерение явным и работает
 * единообразно для всех хендлеров.)
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
