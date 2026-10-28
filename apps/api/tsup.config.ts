import { defineConfig } from 'tsup';

/**
 * Прод-сборка: бандлим точки входа (сервер, миграции, наполнение базы) в ESM под Node 22. Внутренние workspace-пакеты
 * (исходники .ts) инлайнятся; npm-зависимости остаются внешними (ставятся в Docker).
 */
export default defineConfig({
  entry: ['src/server.ts', 'src/migrate.ts', 'src/seed.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: ['@china-ru/shared', '@china-ru/db'],
});
