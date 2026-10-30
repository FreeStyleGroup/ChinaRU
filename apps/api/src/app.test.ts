import { createServer, type Server } from 'node:http';

import {
  CategoryRepository,
  ProductRepository,
  SellerRepository,
  UserRepository,
  type Database,
} from '@china-ru/db';
import { createTestDb } from '@china-ru/db/testing';
import { LEGAL_DOCS } from '@china-ru/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';

interface Seeded {
  productSlug: string;
  productId: string;
}

let db: Database;
let close: () => Promise<void>;
let server: Server;
let seeded: Seeded;

async function seed(database: Database): Promise<Seeded> {
  const users = new UserRepository(database);
  const sellers = new SellerRepository(database);
  const categories = new CategoryRepository(database);
  const products = new ProductRepository(database);

  const sellerUser = await users.create({
    email: 'seller@china-ru.test',
    passwordHash: 'x',
    role: 'seller',
  });
  const profile = await sellers.create({
    userId: sellerUser.id,
    companyName: 'Test Seller Co',
  });
  const category = await categories.create({ slug: 'machines', nameRu: 'Станки' });
  const product = await products.create({
    sellerId: profile.id,
    categoryId: category.id,
    slug: 'cnc-router-1325',
    sku: 'CNC-1325',
    nameRu: 'ЧПУ-фрезер 1325',
    price: '100.00',
    stock: 5,
    status: 'active',
  });
  return { productSlug: product.slug, productId: product.id };
}

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  server = createServer(createApp({ db, config: loadConfig(), logger: createLogger('test') }));
  await new Promise<void>(resolve => {
    server.listen(0, resolve);
  });
  seeded = await seed(db);
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

describe('health & openapi', () => {
  it('GET /api/health → ok envelope', async () => {
    const res = await request(server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, data: { status: 'ok', service: 'api' } });
  });

  it('файлы API можно встраивать с соседнего поддомена (витрина, админка)', async () => {
    const res = await request(server).get('/api/health');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-site');
  });

  it('GET /api/v1/openapi.json → OpenAPI 3.1 document', async () => {
    const res = await request(server).get('/api/v1/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ openapi: '3.1.0' });
    expect(res.body.paths).toHaveProperty('/auth/login');
  });

  it('unknown route → 404 envelope', async () => {
    const res = await request(server).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'not_found' } });
  });
});

describe('csrf origin guard', () => {
  it('rejects a state-changing request from a foreign Origin (403)', async () => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://evil.example.com')
      .send({ email: 'a@b.co', password: 'secret123' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('csrf');
  });

  it('allows a state-changing request from an allowed Origin', async () => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'nobody@x.test', password: 'secret123' });
    // Origin прошёл CSRF → доходит до логики (неверные креды), но не 403/csrf.
    expect(res.body.error?.code).not.toBe('csrf');
  });

  it('allows safe (GET) requests from any Origin', async () => {
    const res = await request(server)
      .get('/api/v1/catalog/categories')
      .set('Origin', 'http://evil.example.com');
    expect(res.status).toBe(200);
  });
});

describe('auth flow', () => {
  let agent: ReturnType<typeof request.agent>;
  beforeAll(() => {
    agent = request.agent(server);
  });

  it('rejects invalid registration with 422 + field errors', async () => {
    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('validation');
    expect(res.body.error.fields).toHaveProperty('email');
  });

  it('refuses registration without consent to personal data processing', async () => {
    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({ email: 'no-consent@china-ru.test', password: 'secret123' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty('pdConsent');
    expect(await new UserRepository(db).findByEmail('no-consent@china-ru.test')).toBeNull();
  });

  it('registers, sets cookies and returns the user', async () => {
    const res = await agent
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'Buyer@China-RU.test', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('buyer@china-ru.test');
    expect(res.body.data.tokens.accessToken).toBeTypeOf('string');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('records when and to which document the consent was given', async () => {
    const user = await new UserRepository(db).findByEmail('buyer@china-ru.test');
    expect(user?.pdConsentAt).toBeInstanceOf(Date);
    expect(user?.pdConsentDoc).toBe(LEGAL_DOCS.pdConsent);
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'buyer@china-ru.test', password: 'secret123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('email_taken');
  });

  it('GET /auth/me with session cookie returns the current user', async () => {
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('buyer@china-ru.test');
  });

  it('GET /auth/me without auth → 401', async () => {
    const res = await request(server).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });
});

describe('account (cabinet)', () => {
  let agent: ReturnType<typeof request.agent>;
  beforeAll(async () => {
    agent = request.agent(server);
    await agent
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'acc@china.test', password: 'secret123' });
  });

  it('updates profile fields', async () => {
    const res = await agent.patch('/api/v1/account/profile').send({ name: 'Иван', locale: 'zh' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Иван');
    expect(res.body.data.locale).toBe('zh');
  });

  it('saves enabled optional menu sections (filtering unknown keys)', async () => {
    const res = await agent
      .put('/api/v1/account/menu')
      .send({ sections: ['tenders', 'horoscope', 'not-a-section', 'profile'] });
    expect(res.status).toBe(200);
    // profile (pinned) и неизвестные ключи отфильтрованы.
    expect(res.body.data.menuSections).toEqual(['tenders', 'horoscope']);
  });

  it('rejects profile update without auth', async () => {
    const res = await request(server).patch('/api/v1/account/profile').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('catalog', () => {
  it('lists products with the seeded item', async () => {
    const res = await request(server).get('/api/v1/catalog/products');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0]).toHaveProperty('slug');
  });

  it('returns a product by slug', async () => {
    const res = await request(server).get(`/api/v1/catalog/products/${seeded.productSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe(seeded.productSlug);
  });

  it('returns category tree', async () => {
    const res = await request(server).get('/api/v1/catalog/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('404 for unknown slug', async () => {
    const res = await request(server).get('/api/v1/catalog/products/nope');
    expect(res.status).toBe(404);
  });
});

describe('orders', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    agent = request.agent(server);
    await agent
      .post('/api/v1/auth/register')
      .send({ pdConsent: true, email: 'orderer@china-ru.test', password: 'secret123' });
  });

  it('rejects order creation without auth → 401', async () => {
    const res = await request(server)
      .post('/api/v1/orders')
      .send({ items: [{ productId: seeded.productId, qty: 1 }] });
    expect(res.status).toBe(401);
  });

  it('creates an order, computes total and decrements stock', async () => {
    const res = await agent
      .post('/api/v1/orders')
      .send({ items: [{ productId: seeded.productId, qty: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.data.totalAmount).toBe('200.00');
    expect(res.body.data.items).toHaveLength(1);

    const product = await request(server).get(`/api/v1/catalog/products/${seeded.productSlug}`);
    expect(product.body.data.stock).toBe(3);
  });

  it('rejects an empty order with 422', async () => {
    const res = await agent.post('/api/v1/orders').send({ items: [] });
    expect(res.status).toBe(422);
  });

  it('lists the buyer orders', async () => {
    const res = await agent.get('/api/v1/orders');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
