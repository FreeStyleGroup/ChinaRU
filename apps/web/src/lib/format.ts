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
