import { createApp } from './app';
import { initDb, checkDbConnection, closeDb } from '@china-ru/db';
import { config$ } from './config';
import { logger } from './utils/logger';

async function bootstrap() {
  const app = createApp();

  // Initialize database
  try {
    initDb(config$.DATABASE_URL);
    const isConnected = await checkDbConnection();

    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    logger.info('Database connected');
  } catch (error) {
    logger.error(error, 'Failed to connect to database');
    process.exit(1);
  }

  // Start server
  const server = app.listen(config$.PORT, () => {
    logger.info(`Server listening on port ${config$.PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      await closeDb();
      logger.info('Database connection closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.warn('Forcing shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(error => {
  logger.error(error, 'Fatal error during bootstrap');
  process.exit(1);
});
