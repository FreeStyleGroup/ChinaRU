import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import * as schema from '../schema';

import type { Database, DbHandle } from '../client';

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

/**
 * In-memory PostgreSQL (PGlite) с применёнными миграциями — для интеграционных тестов
 * без Docker. Возвращает тот же тип `Database`, что и prod-клиент (драйверы структурно
 * совместимы по query-API Drizzle).
 */
export async function createTestDb(): Promise<DbHandle> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return {
    db: db as unknown as Database,
    close: async () => {
      await client.close();
    },
  };
}
