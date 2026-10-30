import { createHash, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

import {
  CategoryRepository,
  createDb,
  INDUSTRIAL_CATALOG,
  isUniqueViolation,
  LEGACY_ROOT_CATEGORY_SLUGS,
  ProductRepository,
  SellerRepository,
  UserRepository,
} from '@china-ru/db';
import { emailSchema, productSpecSchema, slugify, slugSchema } from '@china-ru/shared';
import { z } from 'zod';

import { RedisCache } from './cache/cache';
import { loadConfig } from './config';
import { CATEGORIES_CACHE_KEY } from './domain/catalog/catalog.service';
import { createLogger } from './logger';
import { detectImageMime, type WebImageMime } from './storage/image-signature';
import { createStorage } from './storage/storage';

import type { NewProductImageOfProduct } from '@china-ru/db';

/**
 * Перенос каталога промышленного оборудования с основного сайта на экземпляр:
 * 12 корневых разделов с обложками и описаниями + товары от имени продавца
 * (фото, описания на трёх языках, характеристики; цена — «по запросу», как на
 * основном сайте). Данные — packages/db/src/seed-data/industrial-catalog.json;
 * раздел, в котором на основном сайте товаров нет, переносится без товаров.
 *
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node apps/api/dist/seed-catalog.js --seller seller@example.ru [--dry-run]
 *
 * --seller — e-mail учётной записи подтверждённого продавца, от имени которого
 * товары появятся на витрине и на странице его магазина.
 *
 * Повторный запуск безопасен: раздел ищется по слагу, товар — по артикулу
 * продавца (стабильный хеш адреса товара на основном сайте); найденное не
 * перезаписывается — правки продавца после переноса остаются. Фото качаются
 * только с https://china-ru.ru, без переходов по редиректам, с проверкой
 * размера и формата по содержимому.
 */

const IMAGE_HOSTS = new Set(['china-ru.ru']);
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 20_000;
/** Пауза между загрузками: основной сайт живёт на том же сервере. */
const IMAGE_PAUSE_MS = 300;

const text = (max: number) => z.string().trim().min(1).max(max);
const productSchema = z.object({
  sourceUrl: z.url(),
  sourceId: text(300),
  nameRu: text(300),
  nameEn: text(300),
  nameZh: text(300),
  descriptionRu: text(20000),
  descriptionEn: text(20000),
  descriptionZh: text(20000),
  manufacturer: z.string().trim().max(500).nullable().optional(),
  specs: z.array(productSpecSchema).max(39),
  images: z.array(z.url()).min(1).max(6),
});
const categorySchema = z.object({
  slug: slugSchema,
  sort: z.number().int().min(0),
  nameRu: text(200),
  nameEn: text(200),
  nameZh: text(200),
  descriptionRu: text(2000),
  descriptionEn: text(2000),
  descriptionZh: text(2000),
  imageUrl: z.url(),
  // Пустой раздел допустим: на основном сайте в нём пока нет товаров.
  products: z.array(productSchema).max(20),
});
const datasetSchema = z.object({ categories: z.array(categorySchema).min(1) });

interface Downloaded {
  body: Buffer;
  mime: WebImageMime;
}

async function downloadImage(url: string): Promise<Downloaded> {
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.port !== '' || !IMAGE_HOSTS.has(u.hostname)) {
    throw new Error(`адрес не с основного сайта: ${url}`);
  }
  const res = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
  if (!res.ok || !res.body) throw new Error(`HTTP ${String(res.status)}: ${url}`);
  const declared = Number(res.headers.get('content-length') ?? '0');
  if (declared > IMAGE_MAX_BYTES) throw new Error(`больше 8 МБ: ${url}`);

  // Читаем потоком с потолком: заголовок длины может отсутствовать или врать.
  const chunks: Uint8Array[] = [];
  let size = 0;
  // Тело fetch в типах Node — поток `any`; по спецификации это байты.
  const reader = res.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > IMAGE_MAX_BYTES) {
      await reader.cancel();
      throw new Error(`больше 8 МБ: ${url}`);
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks);
  const mime = detectImageMime(body);
  if (!mime) throw new Error(`не JPEG/PNG/WebP: ${url}`);
  await new Promise(resolve => setTimeout(resolve, IMAGE_PAUSE_MS));
  return { body, mime };
}

/** Артикул товара в магазине продавца: стабилен между запусками. */
function skuFor(sourceUrl: string): string {
  return `CRU-${createHash('sha256').update(sourceUrl).digest('hex').slice(0, 10).toUpperCase()}`;
}

/** Производитель — первой строкой характеристик, если его там ещё нет. */
function specsWithManufacturer(
  specs: { name: string; value: string }[],
  manufacturer: string | null | undefined
): { name: string; value: string }[] {
  if (!manufacturer || specs.some(s => s.name.toLowerCase() === 'производитель')) return specs;
  return [{ name: 'Производитель', value: manufacturer }, ...specs];
}

async function run(): Promise<void> {
  const { values } = parseArgs({
    options: { seller: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
  });
  const sellerEmail = emailSchema.parse(values.seller ?? '');
  const dryRun = values['dry-run'];

  const config = loadConfig();
  const logger = createLogger(config.nodeEnv);
  const data = datasetSchema.parse(INDUSTRIAL_CATALOG);
  const productTotal = data.categories.reduce((n, c) => n + c.products.length, 0);
  logger.info(
    `Набор данных: разделов ${String(data.categories.length)}, товаров ${String(productTotal)}`
  );

  const { db, close } = createDb(config.db.url, 1);
  try {
    const users = new UserRepository(db);
    const sellers = new SellerRepository(db);
    const categories = new CategoryRepository(db);
    const products = new ProductRepository(db);

    const user = await users.findByEmail(sellerEmail);
    const seller = user ? await sellers.findByUserId(user.id) : null;
    if (!seller)
      throw new Error(`Продавец ${sellerEmail} не найден: нужна учётная запись с магазином`);
    if (seller.verifyStatus !== 'verified') {
      throw new Error(`Магазин ${seller.companyName} не подтверждён — подтвердите его в админке`);
    }
    logger.info(`Продавец: ${seller.companyName} (#${String(seller.publicId)})`);
    if (dryRun) {
      logger.info('Пробный запуск: данные проверены, запись не выполнялась');
      return;
    }

    const storage = createStorage(config, logger);
    await storage.init();
    const stats = {
      categoriesCreated: 0,
      covers: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      legacyRemoved: 0,
    };

    for (const c of data.categories) {
      let category = await categories.findBySlug(c.slug);
      if (!category) {
        try {
          category = await categories.create({
            slug: c.slug,
            nameRu: c.nameRu,
            nameEn: c.nameEn,
            nameZh: c.nameZh,
            descriptionRu: c.descriptionRu,
            descriptionEn: c.descriptionEn,
            descriptionZh: c.descriptionZh,
            sort: c.sort,
            depth: 0,
          });
        } catch (error) {
          // Слаг остаётся за удалённым разделом: администратор убрал его сам.
          if (!isUniqueViolation(error, 'categories_slug_uidx')) throw error;
          logger.warn(`Раздел «${c.nameRu}» удалён администратором — пропущен вместе с товарами`);
          continue;
        }
        stats.categoriesCreated++;
      } else if (!category.descriptionRu) {
        // Раздел заведён справочным наполнением без описаний — дополняем, не трогая правок.
        category =
          (await categories.update(category.id, {
            descriptionRu: c.descriptionRu,
            descriptionEn: c.descriptionEn,
            descriptionZh: c.descriptionZh,
          })) ?? category;
      }

      if (!category.imageUrl) {
        try {
          const cover = await downloadImage(c.imageUrl);
          const fileId = randomUUID();
          await storage.put(`categories/${category.id}/${fileId}`, cover.body, cover.mime);
          await categories.update(category.id, {
            imageUrl: `${config.apiPublicUrl}/api/v1/files/categories/${category.id}/${fileId}`,
          });
          stats.covers++;
        } catch (error) {
          logger.warn(`Обложка раздела «${c.nameRu}» не загружена: ${String(error)}`);
        }
      }

      for (const p of c.products) {
        const sku = skuFor(p.sourceUrl);
        if (await products.findBySellerSku(seller.id, sku)) {
          stats.skipped++;
          continue;
        }

        // Сначала фото: товар без единой картинки на витрину не выводим.
        const photos: Downloaded[] = [];
        for (const url of p.images) {
          try {
            photos.push(await downloadImage(url));
          } catch (error) {
            logger.warn(`Фото «${p.nameRu}» пропущено: ${String(error)}`);
          }
        }
        if (photos.length === 0) {
          logger.warn(`Товар «${p.nameRu}» пропущен: не загрузилось ни одно фото`);
          stats.failed++;
          continue;
        }

        // Файлы — в хранилище до записи в базу (id товара известен заранее), а
        // товар с фото — одной транзакцией. Не удалась запись — файлы убираются.
        const productId = randomUUID();
        const storedKeys: string[] = [];
        const imageRows: NewProductImageOfProduct[] = [];
        for (const [i, photo] of photos.entries()) {
          const key = `product-images/${productId}/${randomUUID()}`;
          await storage.put(key, photo.body, photo.mime);
          storedKeys.push(key);
          imageRows.push({
            url: `${config.apiPublicUrl}/api/v1/files/${key}`,
            sort: i,
            isPrimary: i === 0,
          });
        }

        const base = slugify(p.nameRu) || sku.toLowerCase();
        const insert = (slug: string) =>
          products.createWithImages(
            {
              id: productId,
              sellerId: seller.id,
              categoryId: category.id,
              slug,
              sku,
              nameRu: p.nameRu,
              nameEn: p.nameEn,
              nameZh: p.nameZh,
              descriptionRu: p.descriptionRu,
              descriptionEn: p.descriptionEn,
              descriptionZh: p.descriptionZh,
              price: null,
              stock: 0,
              status: 'active',
              specs: specsWithManufacturer(p.specs, p.manufacturer),
            },
            imageRows
          );
        try {
          try {
            await insert(base);
          } catch (error) {
            // Слаг занят другим товаром (в том числе удалённым) — уточняем артикулом.
            if (!isUniqueViolation(error, 'products_slug_uidx')) throw error;
            await insert(`${base}-${sku.slice(4).toLowerCase()}`);
          }
        } catch (error) {
          for (const key of storedKeys) await storage.delete(key);
          // Артикул есть у удалённого товара: продавец убрал его сам — не возвращаем.
          if (isUniqueViolation(error, 'products_seller_sku_uidx')) {
            logger.info(`Товар «${p.nameRu}» удалён продавцом — не восстанавливаю`);
            stats.skipped++;
            continue;
          }
          throw error;
        }
        stats.created++;
        logger.info(`+ ${p.nameRu} (${String(photos.length)} фото)`);
      }
    }

    // Потребительские разделы первых версий справочника — убираем пустые.
    for (const legacySlug of LEGACY_ROOT_CATEGORY_SLUGS) {
      const legacy = await categories.findBySlug(legacySlug);
      if (!legacy) continue;
      const inside = await products.countByCategory(legacy.id);
      if (inside === 0) {
        await categories.softDelete(legacy.id);
        stats.legacyRemoved++;
      } else {
        logger.warn(
          `Раздел «${legacy.nameRu}» оставлен: в нём товаров — ${String(inside)}. ` +
            'Перенесите их в промышленные разделы в кабинете продавца и запустите сценарий снова.'
        );
      }
    }

    if (config.cache.enabled) {
      const cache = new RedisCache(config.cache.redisUrl, logger);
      await cache.del(CATEGORIES_CACHE_KEY);
      await cache.close();
    }
    logger.info(
      `Готово: разделов создано ${String(stats.categoriesCreated)}, обложек ${String(stats.covers)}; ` +
        `товаров перенесено ${String(stats.created)}, уже были ${String(stats.skipped)}, ` +
        `пропущено ${String(stats.failed)}; старых разделов убрано ${String(stats.legacyRemoved)}`
    );
  } finally {
    await close();
  }
}

run().catch((error: unknown) => {
  console.error('Перенос каталога не выполнен:', error instanceof Error ? error.message : error);
  process.exit(1);
});
