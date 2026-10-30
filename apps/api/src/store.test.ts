import { createServer, type Server } from 'node:http';

import {
  CategoryRepository,
  ProductRepository,
  SellerRepository,
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

// Минимальный валидный PNG (1×1).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function makeSeller(
  email: string,
  verifyStatus: 'verified' | 'unverified',
  nickname: string | null = null
): Promise<{ agent: request.Agent; sellerId: string; publicId: number }> {
  const agent = request.agent(server);
  const reg = await agent
    .post('/api/v1/auth/register')
    .send({ pdConsent: true, email, password: 'secret123' });
  const userId = (reg.body as { data: { user: { id: string } } }).data.user.id;
  const profile = await new SellerRepository(db).create({
    userId,
    companyName: `Магазин ${email}`,
    verifyStatus,
    ...(nickname ? { nickname } : {}),
  });
  return { agent, sellerId: profile.id, publicId: profile.publicId };
}

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
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

describe('публичная страница магазина', () => {
  it('открывается по никнейму, publicId и id; считает только активные товары', async () => {
    const { sellerId, publicId } = await makeSeller('store-open@x.test', 'verified', 'stanki_shop');
    const category = await new CategoryRepository(db).create({
      slug: 'store-cat',
      nameRu: 'Станки',
    });
    const products = new ProductRepository(db);
    const base = { sellerId, categoryId: category.id, nameRu: 'Станок', price: null, stock: 0 };
    await products.create({ ...base, slug: 'store-p1', sku: 'S-1', status: 'active' });
    await products.create({ ...base, slug: 'store-p2', sku: 'S-2', status: 'active' });
    await products.create({ ...base, slug: 'store-p3', sku: 'S-3', status: 'draft' });

    for (const key of ['stanki_shop', String(publicId), sellerId]) {
      const res = await request(server).get(`/api/v1/stores/${key}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(sellerId);
      expect(res.body.data.verified).toBe(true);
      expect(res.body.data.productCount).toBe(2);
    }
  });

  it('не открывается у неподтверждённого магазина — 404', async () => {
    const { sellerId } = await makeSeller('store-unverified@x.test', 'unverified');
    const res = await request(server).get(`/api/v1/stores/${sellerId}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('store_not_found');
  });

  it('несуществующий ключ — 404, а не 500', async () => {
    for (const key of [
      'no-such-store',
      '999999',
      '00000000-0000-0000-0000-000000000000',
      'Не ник',
    ]) {
      const res = await request(server).get(`/api/v1/stores/${encodeURIComponent(key)}`);
      expect(res.status).toBe(404);
    }
  });
});

describe('оформление магазина продавцом', () => {
  it('описание: сохраняется и показывается на странице, пустое — сбрасывается', async () => {
    const { agent, sellerId } = await makeSeller('store-desc@x.test', 'verified');
    const save = await agent
      .patch('/api/v1/account/seller/store')
      .send({ description: 'Поставляем станки из Китая с 2015 года.' });
    expect(save.status).toBe(200);
    expect(save.body.data.description).toBe('Поставляем станки из Китая с 2015 года.');

    const page = await request(server).get(`/api/v1/stores/${sellerId}`);
    expect(page.body.data.description).toBe('Поставляем станки из Китая с 2015 года.');

    const clear = await agent.patch('/api/v1/account/seller/store').send({ description: '' });
    expect(clear.status).toBe(200);
    expect(clear.body.data.description).toBeNull();
  });

  it('описание длиннее 4000 символов — 422', async () => {
    const { agent } = await makeSeller('store-long@x.test', 'verified');
    const res = await agent
      .patch('/api/v1/account/seller/store')
      .send({ description: 'я'.repeat(4001) });
    expect(res.status).toBe(422);
  });

  it('оформлять можно и до подтверждения магазина', async () => {
    const { agent } = await makeSeller('store-early@x.test', 'unverified');
    const res = await agent
      .patch('/api/v1/account/seller/store')
      .send({ description: 'Готовим витрину' });
    expect(res.status).toBe(200);
  });

  it('без магазина — 403 not_a_seller', async () => {
    const agent = request.agent(server);
    await agent
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'store-buyer@x.test', password: 'secret123' });
    const res = await agent.patch('/api/v1/account/seller/store').send({ description: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('not_a_seller');
  });

  it('баннер: загружается, раздаётся, при замене старый файл пропадает, удаляется', async () => {
    const { agent, sellerId } = await makeSeller('store-banner@x.test', 'verified');
    const first = await agent
      .post('/api/v1/account/seller/store/banner')
      .attach('file', PNG, { filename: 'b.png', contentType: 'image/png' });
    expect(first.status).toBe(200);
    const firstUrl = first.body.data.bannerUrl as string;
    expect(firstUrl).toContain(`/api/v1/files/stores/${sellerId}/`);

    const path = new URL(firstUrl).pathname;
    const served = await request(server).get(path);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toContain('image/png');
    expect(served.headers['cache-control']).toContain('immutable');

    const second = await agent
      .post('/api/v1/account/seller/store/banner')
      .attach('file', PNG, { filename: 'b2.png', contentType: 'image/png' });
    const secondUrl = second.body.data.bannerUrl as string;
    expect(secondUrl).not.toBe(firstUrl);
    expect((await request(server).get(path)).status).toBe(404);

    const page = await request(server).get(`/api/v1/stores/${sellerId}`);
    expect(page.body.data.bannerUrl).toBe(secondUrl);

    const removed = await agent.delete('/api/v1/account/seller/store/banner');
    expect(removed.status).toBe(200);
    expect(removed.body.data.bannerUrl).toBeNull();
    expect((await request(server).get(new URL(secondUrl).pathname)).status).toBe(404);
  });

  it('логотип: принимается картинка и показывается на странице', async () => {
    const { agent, sellerId } = await makeSeller('store-logo@x.test', 'verified');
    const up = await agent
      .post('/api/v1/account/seller/store/logo')
      .attach('file', PNG, { filename: 'l.png', contentType: 'image/png' });
    expect(up.status).toBe(200);
    const page = await request(server).get(`/api/v1/stores/${sellerId}`);
    expect(page.body.data.logoUrl).toBe(up.body.data.logoUrl);
  });

  it('файл не картинка, но с заголовком image/png — 400 unsupported_type', async () => {
    const { agent } = await makeSeller('store-fake@x.test', 'verified');
    const res = await agent
      .post('/api/v1/account/seller/store/banner')
      .attach('file', Buffer.from('<svg onload="alert(1)"></svg>'), {
        filename: 'b.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('unsupported_type');
  });

  it('без входа — 401', async () => {
    const res = await request(server)
      .post('/api/v1/account/seller/store/banner')
      .attach('file', PNG, { filename: 'b.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });
});
