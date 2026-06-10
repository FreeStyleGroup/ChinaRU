import { Response } from 'express';
import { config$ } from '../config';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const setAuthCookies = (res: Response, tokens: TokenPair) => {
  const cookieOptions = {
    httpOnly: true,
    secure: config$.COOKIE_SECURE,
    sameSite: config$.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none',
    maxAge: 24 * 60 * 60 * 1000,
  };

  res.cookie('fs_access', tokens.accessToken, {
    ...cookieOptions,
    path: '/',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('fs_refresh', tokens.refreshToken, {
    ...cookieOptions,
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie('fs_access', { path: '/' });
  res.clearCookie('fs_refresh', { path: '/api/auth' });
};
