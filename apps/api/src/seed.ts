import { createDb, seedReferenceData } from '@china-ru/db';

import { RedisCache } from './cache/cache';
import { loadConfig } from './config';
import { CATEGORIES_CACHE_KEY } from './domain/catalog/catalog.service';
import { createLogger } from './logger';

/**
 * Наполнение базы справочными данными в прод-образе (категории каталога, метро,
 * «Гороскоп», авто-раздел). Запуск после первого старта стека:
 *   docker compose ... exec api node apps/api/dist/seed.js
 * Идемпотентно — повторный запуск безопасен.
 *
 * Дерево категорий API держит в Redis (CACHE_CATEGORIES_TTL, по умолчанию час).
 * Если витрину открыли до наполнения, в кеше осталось пустое дерево — продавец
 * видел бы пустой каталог и выключенную кнопку «Добавить товар» ещё час.
 * Поэтому после наполнения ключ сбрасывается.
 */
async function run(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.nodeEnv);
  const { db, close } = createDb(config.db.url, 1);
  logger.info('Наполняю справочные данные…');
  await seedReferenceData(db);
  await close();

  if (config.cache.enabled) {
    const cache = new RedisCache(config.cache.redisUrl, logger);
    await cache.del(CATEGORIES_CACHE_KEY);
    await cache.close();
  }
  logger.info('Справочные данные на месте');
}

run().catch((error: unknown) => {
  console.error('Seed failed', error);
  process.exit(1);
});
