import { fieldErrors } from '@china-ru/shared';
import { z } from 'zod';

/**
 * Конфигурация API — единая точка истины, валидируется Zod при старте.
 * Никаких `process.env.X!` по коду: чего нет/не в том формате — сервер падает
 * на старте с понятным сообщением, а не в рантайме на первом запросе.
 *
 * `loadConfig()` бросает при ошибке (точка входа server.ts ловит и выходит);
 * сервисы получают нужные значения через DI, а не читают конфиг сами.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  /** CORS: основной фронт (Next.js) и любые доп. origin через запятую. */
  WEB_URL: z.url().default('http://localhost:3000'),
  ADMIN_URL: z.url().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL обязателен' }),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  JWT_ACCESS_SECRET: z.string().min(32, { error: 'JWT_ACCESS_SECRET ≥ 32 символов' }),
  JWT_REFRESH_SECRET: z.string().min(32, { error: 'JWT_REFRESH_SECRET ≥ 32 символов' }),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  JWT_REFRESH_TTL_MOBILE: z.string().default('90d'),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),

  BCRYPT_COST: z.coerce.number().int().min(8).max(15).default(12),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default('China-RU <no-reply@china-ru.ru>'),

  REGISTRATION_OPEN: z
    .enum(['true', 'false'])
    .default('true')
    .transform(v => v === 'true'),
  SELLER_REGISTRATION_OPEN: z
    .enum(['true', 'false'])
    .default('true')
    .transform(v => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export interface AppConfig {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  webUrl: string;
  adminUrl: string;
  db: { url: string; poolMax: number };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
    refreshTtlMobile: string;
  };
  cookie: { domain: string | undefined; secure: boolean };
  bcrypt: { cost: number };
  rateLimit: { windowMs: number; max: number; authMax: number };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
    enabled: boolean;
  };
  features: { registrationOpen: boolean; sellerRegistrationOpen: boolean };
}

/** Ошибка валидации окружения — точка входа печатает её и завершает процесс. */
export class ConfigError extends Error {
  constructor(readonly fields: Record<string, string>) {
    super(`Invalid environment configuration:\n${JSON.stringify(fields, null, 2)}`);
    this.name = 'ConfigError';
  }
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(fieldErrors(parsed.error));
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    webUrl: e.WEB_URL,
    adminUrl: e.ADMIN_URL,
    db: { url: e.DATABASE_URL, poolMax: e.DATABASE_POOL_MAX },
    jwt: {
      accessSecret: e.JWT_ACCESS_SECRET,
      refreshSecret: e.JWT_REFRESH_SECRET,
      accessTtl: e.JWT_ACCESS_TTL,
      refreshTtl: e.JWT_REFRESH_TTL,
      refreshTtlMobile: e.JWT_REFRESH_TTL_MOBILE,
    },
    cookie: { domain: e.COOKIE_DOMAIN, secure: e.COOKIE_SECURE },
    bcrypt: { cost: e.BCRYPT_COST },
    rateLimit: {
      windowMs: e.RATE_LIMIT_WINDOW_MS,
      max: e.RATE_LIMIT_MAX,
      authMax: e.AUTH_RATE_LIMIT_MAX,
    },
    smtp: {
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      user: e.SMTP_USER,
      password: e.SMTP_PASSWORD,
      from: e.MAIL_FROM,
      enabled: e.SMTP_HOST.length > 0,
    },
    features: {
      registrationOpen: e.REGISTRATION_OPEN,
      sellerRegistrationOpen: e.SELLER_REGISTRATION_OPEN,
    },
  };
}
