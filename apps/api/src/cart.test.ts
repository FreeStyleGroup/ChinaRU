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
let productSlug: string;

async function seedProduct(database: Database): Promise<{ id: string; slug: string }> {
  const users = new UserRepository(database);
  const sellers = new SellerRepository(database);
  const categories = new CategoryRepository(database);
  const products = new ProductRepository(database);

  const sellerUser = await users.create({
    email: 'cart-seller@china-ru.test',
    passwordHash: 'x',
    role: 'seller',
  });
  const profile = await sellers.create({ userId: sellerUser.id, companyName: 'Cart Seller Co' });
  const category = await categories.create({ slug: 'cart-cat', nameRu: 'Категория' });
  const product = await products.create({
    sellerId: profile.id,
    categoryId: category.id,
    slug: 'cart-widget',
    sku: 'CART-1',
    nameRu: 'Товар для корзины',
    price: '100.00',
    stock: 5,
    status: 'active',
  });
  return { id: product.id, slug: product.slug };
}

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  server = createServer(createApp({ db, config: loadConfig(), logger: createLogger('test') }));
  await new Promise<void>(resolve => {
    server.listen(0, resolve);
  });
  const seeded = await seedProduct(db);
  productId = seeded.id;
  productSlug = seeded.slug;
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

describe('cart flow', () => {
  let agent: ReturnType<typeof request.agent>;
  let itemId: string;

  beforeAll(async () => {
    agent = request.agent(server);
    await agent
      .post('/api/v1/auth/register')
      .send({ email: 'cart-buyer@china-ru.test', password: 'secret123' });
  });

  it('rejects cart access without auth → 401', async () => {
    const res = await request(server).get('/api/v1/cart');
    expect(res.status).toBe(401);
  });

  it('returns an empty cart initially', async () => {
    const res = await agent.get('/api/v1/cart');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.totalQty).toBe(0);
    expect(res.body.data.totalAmount).toBe('0.00');
  });

  it('adds an item and computes line + totals', async () => {
    const res = await agent.post('/api/v1/cart/items').send({ productId, qty: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(1);
    const item = res.body.data.items[0];
    itemId = item.id as string;
    expect(item.qty).toBe(2);
    expect(item.lineTotal).toBe('200.00');
    expect(item.available).toBe(true);
    expect(res.body.data.totalQty).toBe(2);
    expect(res.body.data.totalAmount).toBe('200.00');
  });

  it('adding the same product increments quantity (upsert)', async () => {
    const res = await agent.post('/api/v1/cart/items').send({ productId, qty: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].qty).toBe(3);
  });

  it('updates an item quantity', async () => {
    const res = await agent.patch(`/api/v1/cart/items/${itemId}`).send({ qty: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].qty).toBe(1);
    expect(res.body.data.totalAmount).toBe('100.00');
  });

  it('rejects adding a non-existent product → 404', async () => {
    const res = await agent
      .post('/api/v1/cart/items')
      .send({ productId: '00000000-0000-0000-0000-000000000000', qty: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('product_unavailable');
  });

  it('checks out: creates an order, clears the cart, decrements stock', async () => {
    const res = await agent.post('/api/v1/cart/checkout');
    expect(res.status).toBe(201);
    expect(res.body.data.totalAmount).toBe('100.00');
    expect(res.body.data.items).toHaveLength(1);

    const cart = await agent.get('/api/v1/cart');
    expect(cart.body.data.items).toHaveLength(0);

    const product = await request(server).get(`/api/v1/catalog/products/${productSlug}`);
    expect(product.body.data.stock).toBe(4);
  });

  it('rejects checkout of an empty cart → 400', async () => {
    const res = await agent.post('/api/v1/cart/checkout');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('empty_cart');
  });
});
