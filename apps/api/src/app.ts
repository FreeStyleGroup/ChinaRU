import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { asyncHandler } from './middleware/asyncHandler';
import { logger } from './utils/logger';
import { config$ } from './config';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // CORS
  app.use(
    cors({
      origin: config$.NODE_ENV === 'production' ? 'https://china-ru.ru' : 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Health check
  app.get(
    '/api/health',
    asyncHandler(async (req, res) => {
      res.json({ status: 'ok' });
    })
  );

  // API routes (will be added in routes/index.ts)
  // app.use('/api', apiRoutes);

  // 404
  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
