import { createServer, type Server } from 'node:http';

import {
  AuditRepository,
  CategoryRepository,
  ProductRepository,
  ReviewRepository,
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
let sellerProfileId: string;
let reviewId: string;

async function seed(database: Database): Promise<void> {
  const users = new UserRepository(database);
  const sellers = new SellerRepository(database);
  const categories = new CategoryRepository(database);
  const products = new ProductRepository(database);
  const reviews = new ReviewRepository(database);

  const sellerUser = await users.create({ email: 's@x.test', passwordHash: 'x', role: 'seller' });
  const buyer = await users.create({ email: 'b@x.test', passwordHash: 'x' });
  const profile = await sellers.create({
    userId: sellerUser.id,
    companyName: 'Pending Co',
    verifyStatus: 'pending',
  });
  sellerProfileId = profile.id;
  const category = await categories.create({ slug: 'cat', nameRu: 'Категория' });
  const product = await products.create({
    sellerId: profile.id,
    categoryId: category.id,
    slug: 'p1',
    sku: 'P1',
    nameRu: 'Товар',
    price: '50.00',
    stock: 10,
    status: 'active',
  });
  const review = await reviews.create({
    productId: product.id,
    sellerId: profile.id,
    authorId: buyer.id,
    rating: 5,
    body: 'Отлично',
    status: 'pending',
  });
  reviewId = review.id;
}

/** Регистрирует пользователя агентом и при необходимости повышает его до admin. */
async function makeAgent(email: string, promote: boolean) {
  const agent = request.agent(server);
  const res = await agent.post('/api/v1/auth/register').send({ pdConsent: true, email, password: 'secret123' });
  if (promote) {
    const userId = (res.body as { data: { user: { id: string } } }).data.user.id;
    await new UserRepository(db).update(userId, { role: 'admin' });
  }
  return agent;
}

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  server = createServer(createApp({ db, config: loadConfig(), logger: createLogger('test') }));
  await new Promise<void>(resolve => {
    server.listen(0, resolve);
  });
  await seed(db);
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

describe('admin RBAC', () => {
  it('forbids a non-admin from admin endpoints (403)', async () => {
    const buyer = await makeAgent('buyer-only@x.test', false);
    const res = await buyer.get('/api/v1/admin/stats');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
  });

  it('rejects an unauthenticated request (401)', async () => {
    const res = await request(server).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });
});

describe('admin endpoints', () => {
  let admin: Awaited<ReturnType<typeof makeAgent>>;

  beforeAll(async () => {
    admin = await makeAgent('admin@x.test', true);
  });

  it('returns dashboard stats', async () => {
    const res = await admin.get('/api/v1/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.users).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingSellers).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingReviews).toBeGreaterThanOrEqual(1);
  });

  it('lists users paginated', async () => {
    const res = await admin.get('/api/v1/admin/users?pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('lists pending sellers and verifies one', async () => {
    const list = await admin.get('/api/v1/admin/sellers?verifyStatus=pending');
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);

    const verify = await admin
      .post(`/api/v1/admin/sellers/${sellerProfileId}/verify`)
      .send({ status: 'verified' });
    expect(verify.status).toBe(200);
    expect(verify.body.data.verifyStatus).toBe('verified');
    expect(verify.body.data.verifiedAt).not.toBeNull();

    // Действие записано в audit_log.
    const entries = await new AuditRepository(db).listByEntity('seller', sellerProfileId);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0]?.action).toBe('seller.verify');
  });

  it('lists products and orders', async () => {
    const products = await admin.get('/api/v1/admin/products');
    expect(products.status).toBe(200);
    expect(products.body.data.total).toBeGreaterThanOrEqual(1);

    const orders = await admin.get('/api/v1/admin/orders');
    expect(orders.status).toBe(200);
    expect(Array.isArray(orders.body.data.items)).toBe(true);
  });

  it('lists pending reviews with author and moderates one', async () => {
    const list = await admin.get('/api/v1/admin/reviews?status=pending');
    expect(list.status).toBe(200);
    expect(list.body.data.items[0]).toHaveProperty('author');

    const moderate = await admin
      .post(`/api/v1/admin/reviews/${reviewId}/moderate`)
      .send({ status: 'approved' });
    expect(moderate.status).toBe(200);
    expect(moderate.body.data.status).toBe('approved');
  });
});
