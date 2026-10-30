import { DEFAULT_CONTENT_AGENTS, HOROSCOPE_HERO_IMAGE, slugify, zodiacImage } from '@china-ru/shared';

import { INDUSTRIAL_CATALOG } from './catalog-dataset';
import { ArticleRepository, CategoryRepository, ContentAgentRepository } from './repositories';
import { metroCities } from './schema';
import { seedVehicles } from './seed-vehicles';

import type { Database } from './client';

/**
 * Корневые категории каталога — разделы основного сайта china-ru.ru (маркетплейс
 * промышленного оборудования): без них продавцу некуда положить товар. Обложки
 * разделов и товары переносит отдельный сценарий seed-catalog.
 */
const ROOT_CATEGORIES = INDUSTRIAL_CATALOG.categories.map(c => ({
  slug: c.slug,
  nameRu: c.nameRu,
  nameEn: c.nameEn,
  nameZh: c.nameZh,
  descriptionRu: c.descriptionRu,
  descriptionEn: c.descriptionEn,
  descriptionZh: c.descriptionZh,
  sort: c.sort,
}));

/**
 * Справочные и демонстрационные данные экземпляра: корневые категории каталога,
 * города метро, агент и статьи раздела «Гороскоп», авто-раздел (бренды, модели,
 * дилеры). Идемпотентно: повторный запуск ничего не дублирует.
 *
 * Без категорий продавец не может завести товар — кнопка «Добавить товар» в
 * кабинете выключена, пока каталог пуст. Поэтому наполнение — обязательный шаг
 * развёртывания, а не «по желанию».
 *
 * Вызывается из двух мест:
 *   - npm -w @china-ru/db run db:seed  — разработка (tsx по исходникам);
 *   - node apps/api/dist/seed.js       — прод-образ API (собран tsup вместе с миграциями).
 */
export async function seedReferenceData(db: Database): Promise<void> {
  const categories = new CategoryRepository(db);
  for (const c of ROOT_CATEGORIES) {
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

  // Контент-завод: агент гороскопа + несколько опубликованных статей для блока новостей.
  const agents = new ContentAgentRepository(db);
  const horoPreset = DEFAULT_CONTENT_AGENTS.horoscope;
  if (horoPreset) {
    const agent = await agents.upsert('horoscope', {
      name: horoPreset.name,
      persona: horoPreset.persona,
      topics: horoPreset.topics,
      enabled: true,
    });
    const articles = new ArticleRepository(db);
    const samples = [
      {
        title: 'Год Лошади 2026: что ждать и к чему готовиться',
        excerpt:
          'Энергия года Лошади приносит движение и перемены. Разбираем, как использовать её на полную и каких ловушек избегать.',
        cover: zodiacImage('horse'),
      },
      {
        title: 'Совместимость в браке: 5 пар, которые работают',
        excerpt:
          'Анализируем классические сочетания знаков китайского зодиака — кто кого дополняет, а кому лучше держаться подальше.',
        cover: HOROSCOPE_HERO_IMAGE,
      },
      {
        title: 'Стихия Воды: характер и судьба людей-«водяных»',
        excerpt:
          'Что значит родиться в год Воды по китайской традиции — карьера, финансы, отношения и здоровье.',
        cover: zodiacImage('rat'),
      },
      {
        title: 'Восточный календарь vs западный: где правда',
        excerpt:
          'Почему 12 знаков — это сложная астрономическая система с 60-летним циклом, а не просто «китайские знаки зодиака».',
        cover: HOROSCOPE_HERO_IMAGE,
      },
    ];
    for (const s of samples) {
      const slug = slugify(s.title);
      if (!(await articles.slugExists(slug))) {
        await articles.create({
          section: 'horoscope',
          agentId: agent.id,
          slug,
          title: s.title,
          excerpt: s.excerpt,
          coverImageUrl: s.cover,
          body: `# ${s.title}\n\n${s.excerpt}\n\nЭто демонстрационная статья раздела «Гороскоп». Полноценные материалы пишет ИИ-агент Контент-завода.`,
          status: 'published',
          source: 'manual',
          authorName: horoPreset.name,
          publishedAt: new Date(),
        });
      }
    }
  }

  await seedVehicles(db);
}
