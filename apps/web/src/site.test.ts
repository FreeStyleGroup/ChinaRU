import { describe, expect, it } from 'vitest';

import { SITE_NAME, resolveLocale } from './site';

describe('web/site', () => {
  it('exposes the site name', () => {
    expect(SITE_NAME).toBe('China-RU');
  });

  it('resolves known locales and falls back to ru', () => {
    expect(resolveLocale('zh')).toBe('zh');
    expect(resolveLocale('xx')).toBe('ru');
    expect(resolveLocale(undefined)).toBe('ru');
  });
});
