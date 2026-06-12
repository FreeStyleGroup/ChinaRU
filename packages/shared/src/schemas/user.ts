import { z } from 'zod';

import { idSchema, phoneSchema, timestampsShape } from '../common';
import { localeSchema, userRoleSchema, userStatusSchema } from '../enums';

/** Обновление собственного профиля. Все поля опциональны (PATCH-семантика). */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    avatarUrl: z.url({ error: 'Некорректная ссылка на аватар' }).max(2048),
    locale: localeSchema,
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Полное представление пользователя для собственного кабинета. */
export const userDtoSchema = z.object({
  id: idSchema,
  email: z.string(),
  emailVerified: z.boolean(),
  role: userRoleSchema,
  status: userStatusSchema,
  locale: localeSchema,
  name: z.string().nullable(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  ...timestampsShape,
});
export type UserDto = z.infer<typeof userDtoSchema>;

/** Публичное представление пользователя (автор отзыва, собеседник в чате). */
export const publicUserDtoSchema = z.object({
  id: idSchema,
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type PublicUserDto = z.infer<typeof publicUserDtoSchema>;
