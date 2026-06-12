import { createDb } from './client';
import { CategoryRepository } from './repositories';
import { metroCities } from './schema';

/**
 * Базовый seed справочных данных (категории, метро). Запускается против реальной БД:
 *   DATABASE_URL=... npm -w @china-ru/db run db:seed
 * Полный seed с пользователями/товарами добавится в R3 (нужен bcrypt из api).
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required to seed');
  process.exit(1);
}

const { db, close } = createDb(url, 1);

const rootCategories = [
  { slug: 'electronics', nameRu: 'Электроника', nameZh: '电子产品', sort: 10 },
  { slug: 'clothing', nameRu: 'Одежда и обувь', nameZh: '服装', sort: 20 },
  { slug: 'home', nameRu: 'Дом и сад', nameZh: '家居', sort: 30 },
  { slug: 'industrial', nameRu: 'Промышленное оборудование', nameZh: '工业设备', sort: 40 },
];

try {
  const categories = new CategoryRepository(db);
  for (const c of rootCategories) {
    const existing = await categories.findBySlug(c.slug);
    if (!existing) await categories.create(c);
  }

  await db
    .insert(metroCities)
    .values([
      { slug: 'beijing', nameRu: 'Пекин', nameZh: '北京', country: 'CN', sort: 10 },
      { slug: 'shanghai', nameRu: 'Шанхай', nameZh: '上海', country: 'CN', sort: 20 },
    ])
    .onConflictDoNothing({ target: metroCities.slug });

  process.stdout.write('✓ seed complete\n');
} catch (error) {
  console.error('✗ seed failed:', error);
  process.exitCode = 1;
} finally {
  await close();
}
