import { describe, expect, it } from 'vitest';

import { DB_PACKAGE } from './index';

describe('@china-ru/db', () => {
  it('exposes the package marker', () => {
    expect(DB_PACKAGE).toBe('@china-ru/db');
  });
});
