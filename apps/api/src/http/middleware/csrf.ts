import { ForbiddenError } from '../errors';

import type { RequestHandler } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Лёгкая защита от CSRF для cookie-сессий: на изменяющих методах сверяем заголовок
 * Origin со списком разрешённых. Браузер при кросс-сайтовом запросе ВСЕГДА шлёт Origin,
 * поэтому достаточно отклонять чужой Origin. Запросы без Origin (сервер-сервер, нативные
 * клиенты) и Bearer-запросы (мобильные, без амбиентных cookie) пропускаем.
 */
export function createCsrfGuard(allowedOrigins: Set<string>): RequestHandler {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }
    if (req.get('authorization')?.startsWith('Bearer ')) {
      next();
      return;
    }
    const origin = req.get('origin');
    if (!origin || allowedOrigins.has(origin)) {
      next();
      return;
    }
    next(new ForbiddenError('Запрос отклонён (проверка CSRF)', 'csrf'));
  };
}
