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
    // Каждый интеграционный файл поднимает свой инстанс PGlite (in-memory Postgres).
    // Без ограничения форков десятки инстансов конкурируют за CPU и хук beforeAll
    // (createTestDb) срывается по таймауту. Ограничиваем параллелизм и даём хукам запас.
    hookTimeout: 30_000,
    testTimeout: 30_000,
    poolOptions: { forks: { maxForks: 4, minForks: 1 } },
  },
});
