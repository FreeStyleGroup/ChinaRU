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
  const category = await new CategoryRepository(db).create({ slug: 'so-cat', nameRu: 'Оборудование' });
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

describe('seller orders (fulfillment lifecycle)', () => {
  let seller: ReturnType<typeof request.agent>;
  let buyer: ReturnType<typeof request.agent>;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    // Верифицированный продавец с одним активным товаром.
    seller = request.agent(server);
    const reg = await seller
      .post('/api/v1/auth/register')
      .send({ email: 'so-seller@x.test', password: 'secret123' });
    const sellerUserId = reg.body.data.user.id as string;
    await new SellerRepository(db).create({
      userId: sellerUserId,
      companyName: 'Насосы Тест',
      verifyStatus: 'verified',
    });
    const created = await seller.post('/api/v1/seller/products').send({
      categoryId,
      slug: 'so-pump',
      sku: 'SO-PUMP',
      nameRu: 'Насос SO',
      price: '1000.00',
      stock: 5,
    });
    productId = created.body.data.id as string;
    await seller.patch(`/api/v1/seller/products/${productId}`).send({ status: 'active' });

    // Покупатель оформляет заказ на 2 шт.
    buyer = request.agent(server);
    await buyer.post('/api/v1/auth/register').send({ email: 'so-buyer@x.test', password: 'secret123' });
    const order = await buyer.post('/api/v1/orders').send({ items: [{ productId, qty: 2 }] });
    orderId = order.body.data.id as string;
  });

  it('forbids a non-seller from listing seller orders → 403', async () => {
    const res = await buyer.get('/api/v1/seller/orders');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('not_a_seller');
  });

  it('lists the order with only the seller items, subtotal and processing status', async () => {
    const res = await seller.get('/api/v1/seller/orders');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const so = res.body.data[0];
    expect(so.orderId).toBe(orderId);
    expect(so.items).toHaveLength(1);
    expect(so.items[0].productId).toBe(productId);
    expect(so.items[0].lineTotal).toBe('2000.00');
    expect(so.subtotal).toBe('2000.00');
    expect(so.fulfillmentStatus).toBe('processing');
  });

  it('advances processing → shipped', async () => {
    const res = await seller
      .patch(`/api/v1/seller/orders/${orderId}/fulfillment`)
      .send({ status: 'shipped' });
    expect(res.status).toBe(200);
    expect(res.body.data.fulfillmentStatus).toBe('shipped');
    expect(res.body.data.items[0].fulfillmentStatus).toBe('shipped');
  });

  it('rejects an illegal transition shipped → cancelled → 409', async () => {
    const res = await seller
      .patch(`/api/v1/seller/orders/${orderId}/fulfillment`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('invalid_fulfillment_transition');
  });

  it('advances shipped → delivered', async () => {
    const res = await seller
      .patch(`/api/v1/seller/orders/${orderId}/fulfillment`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.data.fulfillmentStatus).toBe('delivered');
  });

  it('404s when changing fulfillment for a foreign/unknown order', async () => {
    const res = await seller
      .patch('/api/v1/seller/orders/00000000-0000-0000-0000-000000000000/fulfillment')
      .send({ status: 'shipped' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('order_not_found');
  });

  it('notifies the buyer on fulfillment change', async () => {
    const res = await buyer.get('/api/v1/account/notifications?page=1&pageSize=20');
    expect(res.status).toBe(200);
    const orderNotes = (res.body.data.items as { type: string; payload: { fulfillmentStatus?: string } }[])
      .filter(n => n.type === 'order' && n.payload.fulfillmentStatus);
    expect(orderNotes.length).toBeGreaterThan(0);
  });
});
