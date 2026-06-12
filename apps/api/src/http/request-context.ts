import type { RequestContext } from '../domain/auth/auth.service';
import type { Request } from 'express';

/** Извлекает контекст запроса (для аудита токенов и выбора TTL веб/мобайл). */
export function requestContext(req: Request): RequestContext {
  const platform = req.get('x-platform');
  return {
    userAgent: req.get('user-agent') ?? null,
    ip: req.ip ?? null,
    mobile: platform === 'ios' || platform === 'android',
  };
}
