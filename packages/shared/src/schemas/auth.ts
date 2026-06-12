import { z } from 'zod';

import { emailSchema, opaqueTokenSchema, passwordSchema } from '../common';
import { localeSchema } from '../enums';

/** Регистрация нового пользователя (покупателя). */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(120).optional(),
  locale: localeSchema.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Вход по email + паролю. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Введите пароль' }),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Подтверждение email по токену из письма. */
export const emailVerifySchema = z.object({ token: opaqueTokenSchema });
export type EmailVerifyInput = z.infer<typeof emailVerifySchema>;

/** Запрос ссылки на сброс пароля. */
export const passwordResetRequestSchema = z.object({ email: emailSchema });
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

/** Установка нового пароля по токену сброса. */
export const passwordResetConfirmSchema = z.object({
  token: opaqueTokenSchema,
  password: passwordSchema,
});
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

/** Смена пароля авторизованным пользователем. */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: 'Введите текущий пароль' }),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Пара токенов, возвращаемая после login/register/refresh.
 * Access — короткоживущий Bearer; refresh живёт в httpOnly-cookie (web)
 * либо возвращается телом для мобильных клиентов.
 */
export const authTokensSchema = z.object({
  accessToken: z.string(),
  /** TTL access-токена в секундах. */
  expiresIn: z.number().int().positive(),
  refreshToken: z.string().optional(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;
