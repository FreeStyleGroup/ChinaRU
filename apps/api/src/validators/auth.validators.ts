import { z } from 'zod';
import { VALIDATION } from '@china-ru/shared';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH)
    .regex(VALIDATION.PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number, and special character'),
  name: z.string().min(2).max(255),
  role: z.enum(['buyer', 'seller']),
  locale: z.enum(['ru', 'en', 'zh']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH)
    .regex(VALIDATION.PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number, and special character'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
