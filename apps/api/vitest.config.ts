import { defineConfig } from 'vitest/config';

/**
 * Тестовое окружение API. Секреты-заглушки удовлетворяют Zod-валидацию конфига,
 * bcrypt cost понижен для скорости. Реальная БД не нужна — интеграционные тесты
 * идут на PGlite (см. app.test.ts).
 */
export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      JWT_ACCESS_SECRET: 'test_access_secret_must_be_at_least_32_chars',
      JWT_REFRESH_SECRET: 'test_refresh_secret_must_be_at_least_32_chars',
      BCRYPT_COST: '8',
    },
  },
});
