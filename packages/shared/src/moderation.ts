/**
 * Контент-модерация пользовательских текстов (посты, комментарии) — единый
 * источник правды для портала. Ловит три класса нарушений:
 *  - `links`     — внешние ссылки/домены (антиспам: запрет тянуть на свои сайты);
 *  - `profanity` — нецензурная лексика (мат);
 *  - `banned`    — стоп-слова (порно, наркотики, классический спам).
 *
 * Применяется на сервере (жёсткий запрет) и может подсказывать на клиенте.
 * Списки намеренно консервативны (длинные основы) — чтобы не ловить ложные
 * срабатывания вроде «команда», «педикюр», «хлеба», «героиня».
 */

export type ContentViolation = 'links' | 'profanity' | 'banned';

export interface ContentCheckResult {
  ok: boolean;
  violations: ContentViolation[];
}

/* ── Ссылки и домены ── */

// Свой домен — не считается «внешней ссылкой» (упоминание China.ru разрешено).
const OWN_DOMAIN_RE = /\b(?:https?:\/\/)?(?:www\.)?china\.ru\b\S*/gi;

const URL_RE = /(https?:\/\/|www\.)\S+/i;
const TLD =
  '(?:ru|su|рф|com|net|org|io|info|biz|online|shop|store|site|xyz|top|club|pro|me|cc|tv|app|dev|co|cn|kz|by|ua|gg|link|click)';
const DOMAIN_RE = new RegExp(`(?:^|[\\s(,])[a-zа-я0-9][a-zа-я0-9-]*\\.${TLD}\\b`, 'i');

/* ── Анти-обфускация ── */

// Латинские/цифровые «двойники» кириллицы — чтобы поймать «х0й», «cyка», «xуй».
const LOOKALIKE: Record<string, string> = {
  a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', x: 'х', y: 'у', k: 'к', m: 'м', h: 'н',
  t: 'т', b: 'в', u: 'и', '3': 'з', '0': 'о', '4': 'ч', '6': 'б', '@': 'а', $: 'с',
};

/** Кириллический «компакт»: lookalike→кириллица, ё→е, только буквы (ловит «х у й», «п.и.з.д»). */
function compactCyrillic(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[a-z0-9@$]/g, ch => LOOKALIKE[ch] ?? ch)
    .replace(/[^а-я]/g, '');
}

/** Латинский «компакт»: только латинские буквы (для porn/casino/viagra и т.п.). */
function compactLatin(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, '');
}

/* ── Списки основ (консервативные) ── */

const PROFANITY_STEMS = [
  'хуй', 'хуя', 'хуе', 'хуё', 'хуев', 'хуйн', 'хуйл',
  'пизд', 'спизд', 'пиздец',
  'бляд', 'блядь', 'блять',
  'ебать', 'ебал', 'ебан', 'ебуч', 'ебло', 'еблан', 'выеба', 'заеба', 'наеба', 'уеба', 'въеба', 'отъеба',
  'долбоеб', 'долбоёб',
  'мудак', 'мудил',
  'сука', 'суки', 'сучар',
  'гондон', 'гандон',
  'залупа',
  'пидорас', 'пидор', 'пидар',
];

const BANNED_STEMS_CYR = [
  'порно', 'порнух', 'порнуш',
  'проститутк', 'шлюха', 'шлюхи', 'эскортниц',
  'педофил', 'зоофил',
  'наркотик', 'кокаин', 'амфетамин', 'мефедрон', 'гашиш', 'спайс', 'насвай',
  'казино', 'виагра',
];

const BANNED_STEMS_LAT = [
  'porno', 'porn', 'xxx',
  'casino', 'viagra', 'escort', 'sexcam', 'sexvideo', 'webcamsex',
];

/* ── API ── */

export function inspectContent(text: string): ContentCheckResult {
  const violations: ContentViolation[] = [];

  // Свой домен вырезаем до проверки ссылок — он разрешён.
  const linkScan = text.replace(OWN_DOMAIN_RE, ' ');
  if (URL_RE.test(linkScan) || DOMAIN_RE.test(linkScan)) violations.push('links');

  const cyr = compactCyrillic(text);
  if (PROFANITY_STEMS.some(stem => cyr.includes(stem))) violations.push('profanity');

  const lat = compactLatin(text);
  if (BANNED_STEMS_CYR.some(stem => cyr.includes(stem)) || BANNED_STEMS_LAT.some(stem => lat.includes(stem))) {
    violations.push('banned');
  }

  return { ok: violations.length === 0, violations };
}

export const CONTENT_VIOLATION_MESSAGES: Record<ContentViolation, string> = {
  links: 'Ссылки на внешние сайты в публикациях запрещены',
  profanity: 'Уберите нецензурную лексику',
  banned: 'Текст содержит запрещённые слова',
};

/** Человекочитаемое сообщение по найденным нарушениям (для 422/подсказки в форме). */
export function contentViolationMessage(violations: ContentViolation[]): string {
  return violations.map(v => CONTENT_VIOLATION_MESSAGES[v]).join('. ') || 'Текст не прошёл модерацию';
}
