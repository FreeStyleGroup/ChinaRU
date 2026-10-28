/** Дата → короткий локальный формат для таблиц. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** Денежная строка + код валюты. */
/** Сумма для людей: «99 000 ₽», «1 250 ¥». */
export function formatMoney(amount: string, currency: string): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency.toUpperCase()}`;
  }
}
