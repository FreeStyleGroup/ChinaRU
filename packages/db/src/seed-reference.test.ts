import { count } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { articles, categories, metroCities, vehicleBrands } from './schema';
import { seedReferenceData } from './seed-reference';
import { createTestDb } from './testing/pglite';

import type { DbHandle } from './client';
import type { PgTable } from 'drizzle-orm/pg-core';

let handle: DbHandle;

beforeEach(async () => {
  handle = await createTestDb();
});

afterEach(async () => {
  await handle.close();
});

async function rows(table: PgTable): Promise<number> {
  const [r] = await handle.db.select({ c: count() }).from(table);
  return r?.c ?? 0;
}

async function snapshot() {
  return {
    categories: await rows(categories),
    metro: await rows(metroCities),
    articles: await rows(articles),
    brands: await rows(vehicleBrands),
  };
}

describe('seedReferenceData', () => {
  it('наполняет каталог категориями — без них продавец не может завести товар', async () => {
    await seedReferenceData(handle.db);
    const s = await snapshot();
    expect(s.categories).toBe(12);
    expect(s.metro).toBe(2);
    expect(s.articles).toBeGreaterThan(0);
    expect(s.brands).toBeGreaterThan(0);
  });

  it('повторный запуск ничего не дублирует', async () => {
    await seedReferenceData(handle.db);
    const before = await snapshot();
    await seedReferenceData(handle.db);
    expect(await snapshot()).toEqual(before);
  });
});
