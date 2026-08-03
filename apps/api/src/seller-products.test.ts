import { createServer, type Server } from 'node:http';

import { CategoryRepository, SellerRepository, type Database } from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';

let db: Database;
let close: () => Promise<void>;
let server: Server;
let categoryId: string;

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  server = createServer(createApp({ db, config: loadConfig(), logger: createLogger('test') }));
  await new Promise<void>(resolve => {
    server.listen(0, resolve);
  });
  const category = await new CategoryRepository(db).create({ slug: 'sp-cat', nameRu: 'Оборудование' });
  categoryId = category.id;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => {
      if (err) reject(err);
      else resolve();
    });
  });
  await close();
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('seller products', () => {
  let seller: ReturnType<typeof request.agent>;
  let buyer: ReturnType<typeof request.agent>;
  let productId: string;

  beforeAll(async () => {
    // Покупатель без магазина.
    buyer = request.agent(server);
    await buyer.post('/api/v1/auth/register').send({ email: 'sp-buyer@x.test', password: 'secret123' });

    // Продавец: регистрируем и вручную выдаём верифицированный профиль магазина.
    seller = request.agent(server);
    const reg = await seller
      .post('/api/v1/auth/register')
      .send({ email: 'sp-seller@x.test', password: 'secret123' });
    const userId = reg.body.data.user.id as string;
    await new SellerRepository(db).create({
      userId,
      companyName: 'Продавец Тест',
      verifyStatus: 'verified',
    });
  });

  it('forbids product creation without a verified shop → 403', async () => {
    const res = await buyer
      .post('/api/v1/seller/products')
      .send({ categoryId, slug: 'x-1', sku: 'X-1', nameRu: 'Тест', price: '10.00', stock: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('not_a_seller');
  });

  it('creates a product as draft', async () => {
    const res = await seller.post('/api/v1/seller/products').send({
      categoryId,
      slug: 'pump-x100',
      sku: 'PUMP-X100',
      nameRu: 'Насос X100',
      price: '1500.00',
      stock: 7,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.slug).toBe('pump-x100');
    productId = res.body.data.id as string;
  });

  it('lists my products', async () => {
    const res = await seller.get('/api/v1/seller/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].sku).toBe('PUMP-X100');
  });

  it('rejects a duplicate slug → 409', async () => {
    const res = await seller.post('/api/v1/seller/products').send({
      categoryId,
      slug: 'pump-x100',
      sku: 'OTHER',
      nameRu: 'Другой',
      price: '5.00',
      stock: 1,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('slug_taken');
  });

  it('updates the product (price, stock, publish)', async () => {
    const res = await seller
      .patch(`/api/v1/seller/products/${productId}`)
      .send({ price: '1600.00', stock: 10, status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe('1600.00');
    expect(res.body.data.stock).toBe(10);
    expect(res.body.data.status).toBe('active');
  });

  it('uploads and serves a product image', async () => {
    const res = await seller
      .post(`/api/v1/seller/products/${productId}/images`)
      .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data.images).toHaveLength(1);
    expect(res.body.data.images[0].isPrimary).toBe(true);

    const path = new URL(res.body.data.images[0].url as string).pathname;
    const img = await request(server).get(path);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toBe('image/png');
  });

  it('deletes a product image', async () => {
    const list = await seller.get(`/api/v1/seller/products/${productId}`);
    const imageId = list.body.data.images[0].id as string;
    const res = await seller.delete(`/api/v1/seller/products/${productId}/images/${imageId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.images).toHaveLength(0);
  });

  it('soft-deletes the product', async () => {
    const del = await seller.delete(`/api/v1/seller/products/${productId}`);
    expect(del.status).toBe(200);
    const get = await seller.get(`/api/v1/seller/products/${productId}`);
    expect(get.status).toBe(404);
  });
});
