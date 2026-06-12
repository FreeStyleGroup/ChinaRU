/** Дата → короткий локальный формат для таблиц. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** Денежная строка + код валюты. */
export function formatMoney(amount: string, currency: string): string {
  return `${amount} ${currency.toUpperCase()}`;
}
