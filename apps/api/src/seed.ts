import { createDb, seedReferenceData } from '@china-ru/db';

import { loadConfig } from './config';
import { createLogger } from './logger';

/**
 * Наполнение базы справочными данными в прод-образе (категории каталога, метро,
 * «Гороскоп», авто-раздел). Запуск после первого старта стека:
 *   docker compose ... exec api node apps/api/dist/seed.js
 * Идемпотентно — повторный запуск безопасен.
 */
async function run(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.nodeEnv);
  const { db, close } = createDb(config.db.url, 1);
  logger.info('Наполняю справочные данные…');
  await seedReferenceData(db);
  logger.info('Справочные данные на месте');
  await close();
}

run().catch((error: unknown) => {
  console.error('Seed failed', error);
  process.exit(1);
});
