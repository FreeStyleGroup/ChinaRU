import { describe, expect, it } from 'vitest';

import { formatDate, formatMoney } from './format';

describe('admin format', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2026-06-12T00:00:00.000Z')).toMatch(/2026/);
  });

  it('returns input back on invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('formats money with uppercased currency', () => {
    expect(formatMoney('200.00', 'rub')).toBe('200.00 RUB');
  });
});
