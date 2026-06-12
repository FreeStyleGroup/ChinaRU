import type { AppConfig } from '../config';
import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'cn_access';
export const REFRESH_COOKIE = 'cn_refresh';

/** Маршрут, на котором живёт refresh-cookie — сужает attack surface. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/**
 * httpOnly-cookies для веба. SameSite=Lax — компромисс безопасность/удобство
 * (работает при переходе по ссылке из письма). secure=true в проде (HTTPS).
 */
function baseOptions(config: AppConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: 'lax',
    ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  config: AppConfig,
  tokens: { accessToken: string; refreshToken: string },
  ttl: { accessSec: number; refreshSec: number }
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(config),
    maxAge: ttl.accessSec * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(config),
    path: REFRESH_COOKIE_PATH,
    maxAge: ttl.refreshSec * 1000,
  });
}

export function clearAuthCookies(res: Response, config: AppConfig): void {
  res.clearCookie(ACCESS_COOKIE, baseOptions(config));
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(config), path: REFRESH_COOKIE_PATH });
}
