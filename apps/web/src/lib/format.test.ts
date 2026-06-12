import { describe, expect, it } from 'vitest';

import { formatPrice } from './format';

describe('formatPrice', () => {
  it('formats RUB for the ru locale', () => {
    const out = formatPrice('1500.00', 'rub', 'ru');
    expect(out).toContain('1');
    expect(out).toMatch(/₽|RUB/);
  });

  it('falls back gracefully on an unknown currency-like input', () => {
    expect(formatPrice('100', 'usd', 'en')).toMatch(/\$|USD/);
  });
});
