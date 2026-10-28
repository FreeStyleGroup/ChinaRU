import { createDb } from './client';
import { seedReferenceData } from './seed-reference';

/**
 * Наполнение базы справочными данными для разработки (tsx по исходникам):
 *   DATABASE_URL=... npm -w @china-ru/db run db:seed
 * В прод-образе API то же самое делает `node apps/api/dist/seed.js`.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required to seed');
  process.exit(1);
}

const { db, close } = createDb(url, 1);

try {
  await seedReferenceData(db);
  process.stdout.write('✓ seed complete\n');
} catch (error) {
  console.error('✗ seed failed:', error);
  process.exitCode = 1;
} finally {
  await close();
}
