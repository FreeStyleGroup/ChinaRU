import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { createDb } from './client';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required to run migrations');
  process.exit(1);
}

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
const { db, close } = createDb(url, 1);

try {
  await migrate(db, { migrationsFolder });
  process.stdout.write('✓ migrations applied\n');
} catch (error) {
  console.error('✗ migration failed:', error);
  process.exitCode = 1;
} finally {
  await close();
}
