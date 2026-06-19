import type { Currency, TenderStatus } from '@china-ru/shared';

const CURRENCY_SYMBOL: Record<Currency, string> = {
  rub: '₽',
  cny: '¥',
  usd: '$',
  eur: '€',
};

/** Денежная строка `numeric` → читаемая сумма с символом валюты. */
export function money(value: string | null, currency: Currency): string | null {
  if (value === null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('ru-RU') + ' ' + CURRENCY_SYMBOL[currency];
}

/** Срок (ISO) → дата+время в локали RU. */
export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Цветовая схема бейджа статуса тендера. */
export function tenderStatusClass(status: TenderStatus): string {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-700';
    case 'review':
      return 'bg-amber-50 text-amber-600';
    case 'awarded':
      return 'bg-blue-50 text-blue-600';
    case 'completed':
      return 'bg-surface text-ink';
    case 'cancelled':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-surface text-muted';
  }
}
