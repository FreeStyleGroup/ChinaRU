import {
  AuditRepository,
  CategoryRepository,
  JobListingRepository,
  ProductRepository,
  seedReferenceData,
  SellerRepository,
  TenderRepository,
  UserRepository,
  type Database,
} from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from './config';
import { DEMO_NOTE, seedDemo, type DemoAccounts } from './demo/seed-demo';
import { MemoryStorage } from './storage/storage';

let db: Database;
let close: () => Promise<void>;
const config = loadConfig();
const storage = new MemoryStorage();
const silent = (): void => undefined;

const accounts: DemoAccounts = {
  buyerEmail: 'demo-buyer@x.test',
  sellerEmail: 'demo-seller@x.test',
  adminEmail: 'demo-admin@x.test',
};

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  await seedReferenceData(db);

  const users = new UserRepository(db);
  const active = { passwordHash: 'x', status: 'active' as const };
  await users.create({ ...active, email: accounts.buyerEmail, role: 'buyer' });
  const sellerUser = await users.create({ ...active, email: accounts.sellerEmail, role: 'seller' });
  await users.create({ ...active, email: accounts.adminEmail, role: 'admin' });

  // Магазин с товаром «цена по запросу» — как после seed-catalog.
  const seller = await new SellerRepository(db).create({
    userId: sellerUser.id,
    companyName: 'ООО «Демо»',
    verifyStatus: 'verified',
  });
  const category = await new CategoryRepository(db).findBySlug(
    'promyshlennoe-pishchevoe-oborudovanie'
  );
  if (!category) throw new Error('нет раздела из справочника');
  await new ProductRepository(db).create({
    sellerId: seller.id,
    categoryId: category.id,
    slug: 'demo-pasterizator',
    sku: 'CRU-TEST',
    nameRu: 'Пастеризатор',
    price: null,
    stock: 0,
    status: 'active',
  });
});

afterAll(async () => {
  await close();
});

describe('seedDemo', () => {
  it('создаёт по записи в каждом разделе через доменные сервисы', async () => {
    const r = await seedDemo(db, storage, config, accounts, silent);
    expect(r).toEqual({
      products: 2,
      orders: 1,
      priceRequests: 1,
      tenders: 1,
      vacancies: 2,
      posts: 3,
    });

    // Тендер опубликован, срок приёма заявок — в будущем.
    const tenders = await new TenderRepository(db).listPublic();
    expect(tenders.rows).toHaveLength(1);
    expect(tenders.rows[0]?.status).toBe('published');
    expect(tenders.rows[0]?.description).toContain(DEMO_NOTE);

    // Одна вакансия одобрена администратором (с записью в журнал), вторая — на модерации.
    const listings = new JobListingRepository(db);
    const published = await listings.listPublic();
    expect(published.rows).toHaveLength(1);
    const audit = await new AuditRepository(db).listByEntity(
      'vacancy',
      published.rows[0]?.id ?? ''
    );
    expect(audit.map(a => a.action)).toEqual(['vacancy.moderate']);
  });

  it('повторный запуск ничего не дублирует', async () => {
    const r = await seedDemo(db, storage, config, accounts, silent);
    expect(r).toEqual({
      products: 0,
      orders: 0,
      priceRequests: 0,
      tenders: 0,
      vacancies: 0,
      posts: 0,
    });
  });

  it('требует три разные учётки и настоящего администратора', async () => {
    await expect(
      seedDemo(db, storage, config, { ...accounts, buyerEmail: accounts.sellerEmail }, silent)
    ).rejects.toThrow('разными');
    await expect(
      seedDemo(db, storage, config, { ...accounts, adminEmail: accounts.buyerEmail }, silent)
    ).rejects.toThrow('разными');
    await expect(
      seedDemo(db, storage, config, { ...accounts, adminEmail: 'nobody@x.test' }, silent)
    ).rejects.toThrow('не найден');

    await new UserRepository(db).create({
      email: 'demo-other@x.test',
      passwordHash: 'x',
      status: 'active',
      role: 'buyer',
    });
    await expect(
      seedDemo(db, storage, config, { ...accounts, adminEmail: 'demo-other@x.test' }, silent)
    ).rejects.toThrow('не администратор');
  });
});
