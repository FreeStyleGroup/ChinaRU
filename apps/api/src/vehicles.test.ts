import { createServer, type Server } from 'node:http';

import {
  CategoryRepository,
  ProductFitmentRepository,
  ProductRepository,
  SellerRepository,
  UserRepository,
  VehicleBrandRepository,
  seedVehicles,
  type Database,
} from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';

let db: Database;
let close: () => Promise<void>;
let server: Server;

async function makeUser(email: string): Promise<request.Agent> {
  const agent = request.agent(server);
  await agent.post('/api/v1/auth/register').send({ pdConsent: true, email, password: 'secret123' });
  return agent;
}

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  await seedVehicles(db);
  server = createServer(createApp({ db, config: loadConfig(), logger: createLogger('test') }));
  await new Promise<void>(resolve => {
    server.listen(0, resolve);
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });
  await close();
});

describe('auto: бренды и модели', () => {
  it('отдаёт бренды с числом моделей и фильтрует по направлению', async () => {
    const all = await request(server).get('/api/v1/auto/brands');
    expect(all.status).toBe(200);
    const names = all.body.data.map((b: { name: string }) => b.name);
    expect(names).toContain('Haval');
    const haval = all.body.data.find((b: { slug: string }) => b.slug === 'haval');
    expect(haval.modelCount).toBeGreaterThan(0);
    expect(haval.types).toContain('auto');

    const moto = await request(server).get('/api/v1/auto/brands?type=moto');
    const motoNames = moto.body.data.map((b: { name: string }) => b.name);
    expect(motoNames).toContain('CFMOTO');
    expect(motoNames).not.toContain('Haval');

    const popular = await request(server).get('/api/v1/auto/brands?popular=true');
    expect(popular.body.data.every((b: { popular: boolean }) => b.popular)).toBe(true);
  });

  it('отдаёт модели бренда', async () => {
    const brand = await new VehicleBrandRepository(db).findBySlug('haval');
    const res = await request(server).get(`/api/v1/auto/brands/${brand?.id ?? ''}/models`);
    expect(res.status).toBe(200);
    const models = res.body.data.map((m: { name: string }) => m.name);
    expect(models).toContain('Jolion');
  });
});

describe('auto: дилеры', () => {
  it('фильтрует дилеров по городу и бренду, отдаёт список городов', async () => {
    const cities = await request(server).get('/api/v1/auto/dealers/cities');
    expect(cities.body.data).toContain('Москва');
    expect(cities.body.data).toContain('Санкт-Петербург');

    const msk = await request(server).get('/api/v1/auto/dealers?city=Москва');
    expect(msk.status).toBe(200);
    expect(msk.body.data.length).toBeGreaterThan(0);
    expect(msk.body.data.every((d: { city: string }) => d.city === 'Москва')).toBe(true);
    // координаты — числа (для карты)
    expect(typeof msk.body.data[0].lat).toBe('number');

    const chery = await new VehicleBrandRepository(db).findBySlug('chery');
    const byBrand = await request(server).get(`/api/v1/auto/dealers?brands=${chery?.id ?? ''}`);
    expect(
      byBrand.body.data.every((d: { brands: { slug: string }[] }) =>
        d.brands.some(b => b.slug === 'chery')
      )
    ).toBe(true);
  });
});

describe('auto: мой гараж + подбор запчастей', () => {
  it('добавляет ТС, отдаёт подобранную запчасть и удаляет', async () => {
    const agent = await makeUser('garage@auto.test');
    const brand = await new VehicleBrandRepository(db).findBySlug('haval');
    const brandId = brand?.id ?? '';

    const models = await request(server).get(`/api/v1/auto/brands/${brandId}/models`);
    const jolion = models.body.data.find((m: { name: string }) => m.name === 'Jolion');

    const added = await agent
      .post('/api/v1/account/garage')
      .send({ brandId, modelId: jolion.id, year: 2023 });
    expect(added.status).toBe(201);
    expect(added.body.data.brandName).toBe('Haval');
    expect(added.body.data.modelName).toBe('Jolion');
    const vehicleId = added.body.data.id as string;

    const list = await agent.get('/api/v1/account/garage');
    expect(list.body.data.length).toBe(1);

    // Готовим товар-запчасть и привязываем к бренду Haval (применимость).
    const seller = await new SellerRepository(db).create({
      userId: (await new UserRepository(db).findByEmail('garage@auto.test'))?.id ?? '',
      companyName: 'Запчасти-Сервис',
      verifyStatus: 'verified',
    });
    const category = await new CategoryRepository(db).create({ slug: 'auto-parts', nameRu: 'Автозапчасти' });
    const product = await new ProductRepository(db).create({
      sellerId: seller.id,
      categoryId: category.id,
      slug: 'oil-filter-haval',
      sku: 'OF-HAVAL-1',
      nameRu: 'Масляный фильтр Haval',
      price: '890.00',
      status: 'active',
    });
    await new ProductFitmentRepository(db).create({ productId: product.id, brandId });

    const parts = await agent.get(`/api/v1/account/garage/${vehicleId}/parts`);
    expect(parts.status).toBe(200);
    const partNames = parts.body.data.map((p: { nameRu: string }) => p.nameRu);
    expect(partNames).toContain('Масляный фильтр Haval');

    const del = await agent.delete(`/api/v1/account/garage/${vehicleId}`);
    expect(del.status).toBe(200);
    const after = await agent.get('/api/v1/account/garage');
    expect(after.body.data.length).toBe(0);
  });

  it('не позволяет смотреть запчасти чужого ТС', async () => {
    const owner = await makeUser('owner@auto.test');
    const brand = await new VehicleBrandRepository(db).findBySlug('geely');
    const added = await owner
      .post('/api/v1/account/garage')
      .send({ brandId: brand?.id ?? '', modelName: 'Coolray' });
    const vehicleId = added.body.data.id as string;

    const intruder = await makeUser('intruder@auto.test');
    const res = await intruder.get(`/api/v1/account/garage/${vehicleId}/parts`);
    expect(res.status).toBe(403);
  });
});
