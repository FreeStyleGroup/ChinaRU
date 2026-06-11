import { describe, expect, it } from 'vitest';

import { err, ok } from './api-response';
import { DEFAULT_LOCALE, isLocale } from './locales';

describe('api-response', () => {
  it('ok() wraps data with ok:true', () => {
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
  });

  it('err() builds an error envelope without fields', () => {
    expect(err('not_found', 'missing')).toEqual({
      ok: false,
      error: { code: 'not_found', message: 'missing' },
    });
  });

  it('err() includes field errors when provided', () => {
    const res = err('validation', 'invalid', { email: 'required' });
    expect(res.ok).toBe(false);
    expect(res.error.fields).toEqual({ email: 'required' });
  });
});

describe('locales', () => {
  it('default locale is ru', () => {
    expect(DEFAULT_LOCALE).toBe('ru');
  });

  it('isLocale recognises supported locales only', () => {
    expect(isLocale('zh')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });
});
