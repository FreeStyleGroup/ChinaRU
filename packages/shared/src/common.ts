import { z } from 'zod';

/**
 * Переиспользуемые примитивы валидации и преобразование ошибок Zod в формат
 * `ApiErr.fields` (см. api-response.ts). Используется во всех доменных схемах
 * и в контроллерах API (R3).
 */

/** UUID-идентификатор сущности. */
export const idSchema = z.uuid({ error: 'Некорректный идентификатор' });

/** ISO-8601 datetime со смещением `Z` (то, что отдаёт `Date.toISOString()`). */
export const isoDateTime = z.iso.datetime();

/** Дата без времени, `YYYY-MM-DD`. */
export const isoDate = z.iso.date();

/** Общие временные поля DTO. Раскрывается в shape объекта: `{ ...timestampsShape }`. */
export const timestampsShape = {
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
} as const;

/** URL-совместимый slug: строчная латиница, цифры, дефис-разделитель. */
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    error: 'Slug: только строчные латинские буквы, цифры и дефис',
  });

/**
 * Никнейм пользователя или магазина: латиница/цифры/подчёркивание/точка, 3–32 символа,
 * начинается с буквы. Доступен только после верификации (см. setNicknameSchema).
 */
export const nicknameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9_.]{2,31}$/, {
    error: 'Никнейм: 3–32 символа, латиница/цифры/_/., начинается с буквы',
  });

/** Денежная сумма как строка `numeric(п,2)` — без потерь точности (никаких float). */
export const moneyString = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, {
  error: 'Некорректная сумма',
});

/** Email: тримминг + нижний регистр на входе, затем валидация формата. */
export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .toLowerCase()
  .pipe(z.email({ error: 'Некорректный email' }));

/** Пароль: 8–128 символов, минимум одна буква и одна цифра. */
export const passwordSchema = z
  .string()
  .min(8, { error: 'Пароль не короче 8 символов' })
  .max(128, { error: 'Пароль не длиннее 128 символов' })
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    error: 'Пароль должен содержать буквы и цифры',
  });

/** Телефон в свободном международном формате. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{6,20}$/, { error: 'Некорректный телефон' });

/** Оценка отзыва 1–5. */
export const ratingValueSchema = z.number().int().min(1).max(5);

/** Уровень HSK 1–6. */
export const hskLevelSchema = z.number().int().min(1).max(6);

/** Непустой токен из письма / ссылки сброса (hex/base64url). */
export const opaqueTokenSchema = z.string().min(16).max(512);

/** Транслитерация кириллицы для генерации slug из русских заголовков. */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Строит URL-slug из произвольного заголовка (RU/EN): транслитерирует кириллицу,
 * приводит к нижнему регистру, схлопывает не-буквенно-цифровое в дефисы.
 * Возвращает `''`, если ничего не осталось (вызывающий добавляет fallback).
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map(ch => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

/**
 * Преобразует `ZodError` в плоскую карту `поле → первое сообщение`,
 * пригодную для `ApiErr.fields`. Берёт по одному (первому) сообщению на путь;
 * корневые ошибки кладёт под ключ `_`. Опирается только на `error.issues`
 * (стабильно в Zod 3 и 4).
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join('.') : '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
