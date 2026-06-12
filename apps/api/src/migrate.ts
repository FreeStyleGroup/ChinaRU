import { createDb } from '@china-ru/db';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { loadConfig } from './config';
import { createLogger } from './logger';

/**
 * Прогон миграций перед стартом API (вызывается из docker-entrypoint).
 * Папка миграций копируется в образ; путь — через MIGRATIONS_DIR (по умолчанию ./drizzle).
 */
async function run(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.nodeEnv);
  const { db, close } = createDb(config.db.url, 1);
  const migrationsFolder = process.env.MIGRATIONS_DIR ?? './drizzle';
  logger.info({ migrationsFolder }, 'Применяю миграции…');
  await migrate(db, { migrationsFolder });
  logger.info('Миграции применены');
  await close();
}

run().catch((error: unknown) => {
  console.error('Migration failed', error);
  process.exit(1);
});
