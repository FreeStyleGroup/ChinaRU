import { err } from '@china-ru/shared';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { createContainer, type ContainerDeps } from './container';
import { createErrorHandler } from './http/error-handler';
import { createCsrfGuard } from './http/middleware/csrf';
import { notFoundHandler } from './http/not-found';
import { createV1Router, healthRouter } from './routes';

/** Создаёт сконфигурированное Express-приложение из инъецированных зависимостей. */
export function createApp(deps: ContainerDeps): Express {
  const { config, logger } = deps;
  const container = createContainer(deps);
  // Идемпотентная подготовка хранилища (создание бакета); ошибки логируются внутри.
  void container.storage.init();

  const app = express();
  // Сколько обратных прокси доверяем — из конфига: за одним nginx это 1,
  // за nginx хостинга плюс нашим — 2. От этого зависят req.ip и rate-limit.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  // Структурное логирование запросов с request-id (observability).
  app.use(pinoHttp({ logger }));
  // Фото товаров и аватары отдаёт API (api.<домен>), а показывает витрина (<домен>)
  // и админка (admin.<домен>). По умолчанию helmet ставит Cross-Origin-Resource-Policy:
  // same-origin — браузер не показывал картинки с соседнего поддомена. same-site
  // пускает только сайты того же домена, чужим сайтам встраивать файлы по-прежнему нельзя.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

  const allowedOrigins = new Set([
    config.webUrl,
    config.adminUrl,
    'http://localhost:3000',
    'http://localhost:5173',
  ]);
  app.use(
    cors({
      // Чужой origin → просто не выставляем CORS-заголовки (браузер заблокирует чтение),
      // без выброса 500. Реальную защиту изменяющих запросов делает csrfGuard ниже.
      origin: (origin, callback) => {
        callback(null, !origin || allowedOrigins.has(origin));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  // Защита от CSRF для cookie-сессий (после cookieParser, до маршрутов).
  app.use('/api', createCsrfGuard(allowedOrigins));

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
