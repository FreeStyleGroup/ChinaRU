import { defineConfig } from 'tsup';

/**
 * Прод-сборка: бандлим точки входа (сервер, миграции, наполнение базы, перенос каталога, демо-записи) в ESM
 * под Node 22. Внутренние workspace-пакеты (исходники .ts) инлайнятся; npm-зависимости остаются внешними.
 */
export default defineConfig({
  entry: [
    'src/server.ts',
    'src/migrate.ts',
    'src/seed.ts',
    'src/seed-catalog.ts',
    'src/seed-demo.ts',
  ],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: ['@china-ru/shared', '@china-ru/db'],
});
