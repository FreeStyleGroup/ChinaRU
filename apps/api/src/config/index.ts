import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  API_URL: z.string().url().default('http://localhost:3001'),
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  JWT_REFRESH_TTL_MOBILE: z.string().default('90d'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.string().transform(v => v === 'true').default('false'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  BCRYPT_COST: z.coerce.number().default(10),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_SECURE: z.string().transform(v => v === 'true'),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  MAIL_FROM: z.string(),
  AITUNNEL_API_KEY: z.string().optional(),
  AITUNNEL_BASE_URL: z.string().url().default('https://api.aitunnel.ru/v1'),
  AITUNNEL_MODEL: z.string().default('gpt-4o-mini'),
  MEILISEARCH_HOST: z.string().url().default('http://localhost:7700'),
  MEILISEARCH_API_KEY: z.string().default(''),
  STORAGE_TYPE: z.enum(['minio', 's3']).default('minio'),
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string().default('china-ru'),
  S3_REGION: z.string().default('us-east-1'),
  REDIS_URL: z.string().url().default('redis://localhost:6379/0'),
  DEFAULT_LOCALE: z.string().default('ru'),
  SUPPORTED_LOCALES: z.string().default('ru,en,zh'),
  REGISTRATION_OPEN: z.string().transform(v => v === 'true').default('true'),
  SELLER_REGISTRATION_OPEN: z.string().transform(v => v === 'true').default('true'),
});

type Config = z.infer<typeof envSchema>;

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Invalid environment variables:', result.error.flatten());
      throw new Error('Invalid environment variables');
    }
    config = result.data;
  }
  return config;
}

export const config$ = getConfig();
