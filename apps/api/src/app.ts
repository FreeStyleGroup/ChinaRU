import { err } from '@china-ru/shared';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { createContainer, type ContainerDeps } from './container';
import { createErrorHandler } from './http/error-handler';
import { notFoundHandler } from './http/not-found';
import { createV1Router, healthRouter } from './routes';

/** Создаёт сконфигурированное Express-приложение из инъецированных зависимостей. */
export function createApp(deps: ContainerDeps): Express {
  const { config, logger } = deps;
  const container = createContainer(deps);

  const app = express();
  // Доверяем первому reverse-proxy (nginx/edge): корректные req.ip и secure-cookies по HTTPS.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());

  const allowedOrigins = new Set([
    config.webUrl,
    config.adminUrl,
    'http://localhost:3000',
    'http://localhost:5173',
  ]);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json(err('rate_limited', 'Слишком много запросов, попробуйте позже'));
      },
    })
  );

  app.use('/api', healthRouter());
  app.use('/api/v1', createV1Router(container, config));

  app.use('/api', notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
