import { createServer, type Server } from 'node:http';

import { CategoryRepository, SellerRepository, UserRepository, type Database } from '@china-ru/db';
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
  const category = await new CategoryRepository(db).create({ slug: 'rv-cat', nameRu: 'Оборудование' });
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

describe('product reviews (verified purchase + moderation)', () => {
  let seller: ReturnType<typeof request.agent>;
  let buyer: ReturnType<typeof request.agent>;
  let stranger: ReturnType<typeof request.agent>;
  let admin: ReturnType<typeof request.agent>;
  let productId: string;
  let productSlug: string;
  let reviewId: string;

  beforeAll(async () => {
    // Продавец с активным товаром.
    seller = request.agent(server);
    const sReg = await seller
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'rv-seller@x.test', password: 'secret123' });
    await new SellerRepository(db).create({
      userId: sReg.body.data.user.id as string,
      companyName: 'Продавец Отзывов',
      verifyStatus: 'verified',
    });
    const created = await seller.post('/api/v1/seller/products').send({
      categoryId,
      slug: 'rv-pump',
      sku: 'RV-PUMP',
      nameRu: 'Насос RV',
      price: '900.00',
      stock: 5,
    });
    productId = created.body.data.id as string;
    productSlug = created.body.data.slug as string;
    await seller.patch(`/api/v1/seller/products/${productId}`).send({ status: 'active' });

    // Покупатель оформляет заказ (даёт право на отзыв).
    buyer = request.agent(server);
    await buyer.post('/api/v1/auth/register').send({ pdConsent: true, email: 'rv-buyer@x.test', password: 'secret123' });
    await buyer.post('/api/v1/orders').send({ items: [{ productId, qty: 1 }] });

    // Посторонний без покупки.
    stranger = request.agent(server);
    await stranger
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'rv-stranger@x.test', password: 'secret123' });

    // Админ.
    admin = request.agent(server);
    const aReg = await admin
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'rv-admin@x.test', password: 'secret123' });
    await new UserRepository(db).update(aReg.body.data.user.id as string, { role: 'admin' });
  });

  it('rejects a review from a non-purchaser → 403', async () => {
    const res = await stranger
      .post(`/api/v1/products/${productId}/reviews`)
      .send({ rating: 5, body: 'Отличный товар, хотя я его не покупал' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('purchase_required');
  });

  it('lets a purchaser leave a review (pending moderation)', async () => {
    const res = await buyer
      .post(`/api/v1/products/${productId}/reviews`)
      .send({ rating: 4, title: 'Хорошо', body: 'Работает как надо, доставили быстро.' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.rating).toBe(4);
    reviewId = res.body.data.id as string;
  });

  it('forbids a second review on the same product → 409', async () => {
    const res = await buyer
      .post(`/api/v1/products/${productId}/reviews`)
      .send({ rating: 1, body: 'Передумал' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('review_exists');
  });

  it('does not show a pending review on the public product page', async () => {
    const res = await request(server).get(`/api/v1/products/${productId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('shows the review and updates product rating after admin approval', async () => {
    const mod = await admin
      .post(`/api/v1/admin/reviews/${reviewId}/moderate`)
      .send({ status: 'approved' });
    expect(mod.status).toBe(200);

    const list = await request(server).get(`/api/v1/products/${productId}/reviews`);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].body).toContain('Работает как надо');
    expect(list.body.data[0].author).toBeDefined();

    // Рейтинг товара пересчитан по одобренным отзывам.
    const product = await request(server).get(`/api/v1/catalog/products/${productSlug}`);
    expect(product.body.data.rating).toBe('4.00');
    expect(product.body.data.reviewCount).toBe(1);
  });

  it('removes the review from the card and rating when rejected', async () => {
    const mod = await admin
      .post(`/api/v1/admin/reviews/${reviewId}/moderate`)
      .send({ status: 'rejected' });
    expect(mod.status).toBe(200);

    const list = await request(server).get(`/api/v1/products/${productId}/reviews`);
    expect(list.body.data).toHaveLength(0);

    const product = await request(server).get(`/api/v1/catalog/products/${productSlug}`);
    expect(product.body.data.rating).toBe('0.00');
    expect(product.body.data.reviewCount).toBe(0);
  });
});
