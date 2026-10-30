import { describe, expect, it } from 'vitest';

import { formatDate, formatMoney } from './format';

describe('admin format', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2026-06-12T00:00:00.000Z')).toMatch(/2026/);
  });

  it('returns input back on invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  // Суммы для людей (aef833b): разряды через неразрывный пробел, без копеек, знак валюты.
  it('formats money for people: grouped, no kopecks, currency sign', () => {
    expect(formatMoney('200.00', 'rub')).toMatch(/^200\s₽$/u);
    expect(formatMoney('99000', 'rub')).toMatch(/^99\s000\s₽$/u);
  });
});
