import { describe, expect, it } from 'vitest';

import { formatPrice, formatSinceMonth, initials } from './format';

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

describe('formatSinceMonth', () => {
  const iso = '2025-10-15T12:00:00.000Z';

  it('puts the Russian month into the genitive case', () => {
    expect(formatSinceMonth(iso, 'ru')).toBe('октября 2025');
  });

  it('uses the plain month-year format elsewhere', () => {
    expect(formatSinceMonth(iso, 'en')).toBe('October 2025');
    expect(formatSinceMonth(iso, 'zh')).toBe('2025年10月');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatSinceMonth('not-a-date', 'ru')).toBe('');
  });
});

describe('initials', () => {
  it('takes the quoted company name over the legal form', () => {
    expect(initials('ООО «Шанхай Машинери»')).toBe('ШМ');
  });

  it('takes the first letters of the first two words', () => {
    expect(initials('Zhejiang Hongli Machinery Co., Ltd.')).toBe('ZH');
    expect(initials('acme')).toBe('A');
  });

  it('falls back to a question mark when there are no letters', () => {
    expect(initials('   ')).toBe('?');
  });
});
