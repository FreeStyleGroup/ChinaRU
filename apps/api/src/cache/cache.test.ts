import { describe, expect, it } from 'vitest';

import { NoopCache, type Cache } from './cache';

describe('NoopCache', () => {
  it('always misses and never throws', async () => {
    const cache: Cache = new NoopCache();
    await cache.set('k', { a: 1 }, 60);
    expect(await cache.get('k')).toBeNull();
    await cache.del('k');
  });
});
