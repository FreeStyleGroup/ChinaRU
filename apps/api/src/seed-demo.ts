import { parseArgs } from 'node:util';

import { createDb } from '@china-ru/db';
import { emailSchema } from '@china-ru/shared';

import { loadConfig } from './config';
import { seedDemo } from './demo/seed-demo';
import { createLogger } from './logger';
import { createStorage } from './storage/storage';

/**
 * Демонстрационные записи для экспертизы реестра ПО: заказ, запрос цены,
 * тендер, вакансии, публикации в «Сообществе» — от имени существующих учётных
 * записей. Каждая запись помечена как демонстрационная. Запускать после
 * seed-catalog (запрос цены берёт товар из перенесённого каталога):
 *
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node apps/api/dist/seed-demo.js --buyer b@example.ru --seller s@example.ru --admin a@example.ru
 *
 * Повторный запуск ничего не дублирует.
 */
async function run(): Promise<void> {
  const { values } = parseArgs({
    options: {
      buyer: { type: 'string' },
      seller: { type: 'string' },
      admin: { type: 'string' },
    },
  });
  const accounts = {
    buyerEmail: emailSchema.parse(values.buyer ?? ''),
    sellerEmail: emailSchema.parse(values.seller ?? ''),
    adminEmail: emailSchema.parse(values.admin ?? ''),
  };

  const config = loadConfig();
  const logger = createLogger(config.nodeEnv);
  const storage = createStorage(config, logger);
  const { db, close } = createDb(config.db.url, 1);
  try {
    const r = await seedDemo(db, storage, config, accounts, message => {
      logger.info(message);
    });
    logger.info(
      `Готово: товаров ${String(r.products)}, заказов ${String(r.orders)}, ` +
        `запросов цены ${String(r.priceRequests)}, тендеров ${String(r.tenders)}, ` +
        `вакансий ${String(r.vacancies)}, публикаций ${String(r.posts)}`
    );
  } finally {
    await close();
  }
}

run().catch((error: unknown) => {
  console.error('Демо-наполнение не выполнено:', error instanceof Error ? error.message : error);
  process.exit(1);
});
