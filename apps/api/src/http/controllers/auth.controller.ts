import {
  changePasswordSchema,
  emailVerifySchema,
  loginSchema,
  ok,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerSchema,
  type AuthTokens,
  type UserDto,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../cookies';
import { UnauthorizedError } from '../errors';
import { requestContext } from '../request-context';

import type { AppConfig } from '../../config';
import type { AuthService } from '../../domain/auth/auth.service';
import type { TokenPair, TokenService } from '../../domain/auth/token.service';
import type { Request, RequestHandler, Response } from 'express';

export interface AuthControllerDeps {
  auth: AuthService;
  tokens: TokenService;
  config: AppConfig;
}

export interface AuthController {
  register: RequestHandler;
  login: RequestHandler;
  refresh: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
  verifyEmail: RequestHandler;
  requestPasswordReset: RequestHandler;
  resetPassword: RequestHandler;
  changePassword: RequestHandler;
}

interface AuthBody {
  user: UserDto;
  tokens: AuthTokens;
}

export function createAuthController(deps: AuthControllerDeps): AuthController {
  const respondWithSession = (
    req: Request,
    res: Response,
    status: number,
    result: { user: UserDto; tokens: TokenPair }
  ): void => {
    const mobile = requestContext(req).mobile === true;
    const refreshSec = mobile ? deps.tokens.refreshTtlMobileSec : deps.tokens.refreshTtlSec;
    setAuthCookies(res, deps.config, result.tokens, {
      accessSec: deps.tokens.accessTtlSec,
      refreshSec,
    });
    const body: AuthBody = {
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        expiresIn: deps.tokens.accessTtlSec,
        // refresh отдаём телом только мобильным (у веба он в httpOnly-cookie).
        ...(mobile ? { refreshToken: result.tokens.refreshToken } : {}),
      },
    };
    res.status(status).json(ok(body));
  };

  const readRefreshToken = (req: Request): string | undefined => {
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const fromCookie = cookies[REFRESH_COOKIE];
    if (fromCookie) return fromCookie;
    const fromBody = (req.body as { refreshToken?: unknown }).refreshToken;
    return typeof fromBody === 'string' ? fromBody : undefined;
  };

  return {
    register: asyncHandler(async (req, res) => {
      const input = registerSchema.parse(req.body);
      const result = await deps.auth.register(input, requestContext(req));
      respondWithSession(req, res, 201, result);
    }),

    login: asyncHandler(async (req, res) => {
      const input = loginSchema.parse(req.body);
      const result = await deps.auth.login(input, requestContext(req));
      respondWithSession(req, res, 200, result);
    }),

    refresh: asyncHandler(async (req, res) => {
      const token = readRefreshToken(req);
      if (!token) throw new UnauthorizedError('Refresh-токен отсутствует', 'no_refresh_token');
      const result = await deps.auth.refresh(token, requestContext(req));
      respondWithSession(req, res, 200, result);
    }),

    logout: asyncHandler(async (req, res) => {
      await deps.auth.logout(readRefreshToken(req));
      clearAuthCookies(res, deps.config);
      res.json(ok({ loggedOut: true }));
    }),

    me: asyncHandler((req, res) => {
      if (!req.user) throw new UnauthorizedError();
      res.json(ok(req.user));
      return Promise.resolve();
    }),

    verifyEmail: asyncHandler(async (req, res) => {
      const { token } = emailVerifySchema.parse(req.body);
      await deps.auth.verifyEmail(token);
      res.json(ok({ verified: true }));
    }),

    requestPasswordReset: asyncHandler(async (req, res) => {
      const { email } = passwordResetRequestSchema.parse(req.body);
      await deps.auth.requestPasswordReset(email);
      // Всегда 200 — не раскрываем, существует ли email.
      res.json(ok({ requested: true }));
    }),

    resetPassword: asyncHandler(async (req, res) => {
      const { token, password } = passwordResetConfirmSchema.parse(req.body);
      await deps.auth.resetPassword(token, password);
      res.json(ok({ reset: true }));
    }),

    changePassword: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = changePasswordSchema.parse(req.body);
      await deps.auth.changePassword(req.auth.userId, input);
      // Смена пароля рвёт все сессии — чистим cookies, требуем повторный вход.
      clearAuthCookies(res, deps.config);
      res.json(ok({ changed: true }));
    }),
  };
}
