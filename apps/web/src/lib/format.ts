import type { Currency } from '@china-ru/shared';

/** Форматирует цену с валютой по локали (₽, ¥, $, €). */
export function formatPrice(price: string, currency: Currency, locale: string): string {
  const value = Number(price);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value} ${currency.toUpperCase()}`;
  }
}

/**
 * Месяц и год для фразы «на площадке с …»: «октября 2025», «October 2025», «2025年10月».
 *
 * По-русски после «с» месяц нужен в родительном падеже, а формат «месяц + год»
 * в CLDR — именительный («октябрь 2025 г.»). Родительный CLDR даёт только в
 * полной дате, поэтому для ru берём из неё части «месяц» и «год».
 */
export function formatSinceMonth(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (locale === 'ru') {
    const parts = new Intl.DateTimeFormat('ru', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(date);
    const month = parts.find(p => p.type === 'month')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    if (month && year) return `${month} ${year}`;
  }
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

/**
 * Инициалы для заглушки логотипа — по двум первым словам названия; если оно
 * в кавычках («ООО «Шанхай Машинери»»), то по названию в кавычках: «ШМ».
 */
export function initials(name: string): string {
  const quoted = /«([^»]+)»|"([^"]+)"/u.exec(name);
  const source = quoted?.[1] ?? quoted?.[2] ?? name;
  const letters = source
    .split(/\s+/u)
    .map(word => /[\p{L}\p{N}]/u.exec(word)?.[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  return letters.toUpperCase() || '?';
}
