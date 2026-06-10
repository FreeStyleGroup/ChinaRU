import { Request, Response } from 'express';
import { authService } from '../services/auth/auth.service';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validators';
import { setAuthCookies, clearAuthCookies } from '../middleware/cookies';
import { asyncHandler } from '../middleware/asyncHandler';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);

    setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);

    setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.fs_refresh;

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'No refresh token' });
    }

    // Verify refresh token
    await authService.authService.tokenService.verifyRefresh(refreshToken);

    // Get user from request (populated by middleware in real implementation)
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Issue new pair
    const result = await authService.authService.tokenService.issuePair(req.user.id, req.user.role);

    setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    clearAuthCookies(res);

    res.json({ success: true, message: 'Logged out successfully' });
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    const { token } = verifyEmailSchema.parse(req.query);
    await authService.verifyEmail(token);

    res.json({ success: true, message: 'Email verified successfully' });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);

    res.json({ success: true, message: 'If email exists, reset link has been sent' });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);

    res.json({ success: true, message: 'Password reset successfully' });
  }),
};
