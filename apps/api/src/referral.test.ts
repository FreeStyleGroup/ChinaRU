import { createServer, type Server } from 'node:http';

import {
  CategoryRepository,
  ProductRepository,
  SellerRepository,
  UserRepository,
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
let productId: string;

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  server = createServer(createApp({ db, config: loadConfig(), logger: createLogger('test') }));
  await new Promise<void>(resolve => {
    server.listen(0, resolve);
  });

  // Товар для оформления заказа.
  const users = new UserRepository(db);
  const sellers = new SellerRepository(db);
  const categories = new CategoryRepository(db);
  const products = new ProductRepository(db);
  const sellerUser = await users.create({ email: 'rs@x.test', passwordHash: 'x', role: 'seller' });
  const profile = await sellers.create({ userId: sellerUser.id, companyName: 'Co' });
  const category = await categories.create({ slug: 'c', nameRu: 'Кат' });
  const product = await products.create({
    sellerId: profile.id,
    categoryId: category.id,
    slug: 'prod',
    sku: 'P',
    nameRu: 'Товар',
    price: '100.00',
    stock: 100,
    status: 'active',
  });
  productId = product.id;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });
  await close();
});

describe('referral MLM', () => {
  it('links referrer on register and accrues money + points on referral order', async () => {
    // Пригласивший.
    const referrer = request.agent(server);
    const reg = await referrer
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'referrer@x.test', password: 'secret123' });
    const refPublicId = (reg.body as { data: { user: { publicId: number } } }).data.user.publicId;
    expect(refPublicId).toBeGreaterThanOrEqual(100001);

    // Приглашённый регистрируется по ?ref и оформляет заказ на 100 ₽.
    const referee = request.agent(server);
    await referee
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'referee@x.test', password: 'secret123', ref: refPublicId });
    const order = await referee.post('/api/v1/orders').send({ items: [{ productId, qty: 1 }] });
    expect(order.status).toBe(201);

    // Сводка пригласившего: доход 10% (10.00) + баллы (10 за оборот + 500 за первую сделку).
    const summary = await referrer.get('/api/v1/account/referral');
    expect(summary.status).toBe(200);
    expect(Number(summary.body.data.totalEarned)).toBeCloseTo(10, 2);
    expect(summary.body.data.points).toBe(510);
    expect(summary.body.data.totalPartners).toBe(1);
    expect(summary.body.data.partners[0].level).toBe(1);
    expect(summary.body.data.partners[0].active).toBe(true);

    // Приглашение ведёт на витрину этого экземпляра, а не на чужой домен.
    const link = new URL(summary.body.data.refLink as string);
    expect(link.origin).toBe(new URL(loadConfig().webUrl).origin);
    expect(link.pathname).toBe('/register');
    expect(link.searchParams.get('ref')).toBe(String(refPublicId));
  });
});
