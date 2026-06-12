import { createDb } from '@china-ru/db';

import { createApp } from './app';
import { ConfigError, loadConfig, type AppConfig } from './config';
import { createLogger } from './logger';

function loadConfigOrExit(): AppConfig {
  try {
    return loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error('❌ Неверная конфигурация окружения:\n', error.fields);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Точка входа: валидируем конфиг, поднимаем пул БД, открываем порт.
 * Падаем быстро и понятно, если окружение некорректно.
 */
function start(): void {
  const config = loadConfigOrExit();
  const logger = createLogger(config.nodeEnv);
  const { db, close } = createDb(config.db.url, config.db.poolMax);

  const app = createApp({ db, config, logger });
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'China.ru API запущен');
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Останавливаемся…');
    server.close(() => {
      void close().then(() => {
        logger.info('Остановлено');
        process.exit(0);
      });
    });
    setTimeout(() => {
      logger.error('Принудительный выход по таймауту');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
}

start();
