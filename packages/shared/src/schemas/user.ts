import { z } from 'zod';

import { idSchema, nicknameSchema, phoneSchema, timestampsShape } from '../common';
import { localeSchema, userRoleSchema, userStatusSchema } from '../enums';

/** Обновление собственного профиля. Все поля опциональны (PATCH-семантика). */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    birthday: z.iso.date({ error: 'Некорректная дата рождения' }),
    avatarUrl: z.url({ error: 'Некорректная ссылка на аватар' }).max(2048),
    locale: localeSchema,
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Выбор/смена никнейма (доступно только верифицированному пользователю/магазину). */
export const setNicknameSchema = z.object({ nickname: nicknameSchema });
export type SetNicknameInput = z.infer<typeof setNicknameSchema>;

/** Решение модератора по верификации пользователя («синяя галочка»). */
export const userVerifyDecisionSchema = z.object({ verified: z.boolean() });
export type UserVerifyDecisionInput = z.infer<typeof userVerifyDecisionSchema>;

/** Полное представление пользователя для собственного кабинета. */
export const userDtoSchema = z.object({
  id: idSchema,
  /** Числовой публичный ID (по умолчанию). */
  publicId: z.number().int(),
  /** Никнейм (после верификации профиля), иначе null. */
  nickname: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean(),
  /** Верифицирован ли профиль («синяя галочка»). */
  verified: z.boolean(),
  role: userRoleSchema,
  status: userStatusSchema,
  locale: localeSchema,
  name: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  /** Дата рождения YYYY-MM-DD (для раздела «Гороскоп»). */
  birthday: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  /** Включённые опциональные разделы кабинета. */
  menuSections: z.array(z.string()),
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
