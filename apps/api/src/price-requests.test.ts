import { createServer, type Server } from 'node:http';

import {
  CategoryRepository,
  OrderError,
  OrderRepository,
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

let seller: request.Agent;
let otherSeller: request.Agent;
let buyer: request.Agent;
let buyerUserId: string;
let onRequestId: string;
let pricedId: string;
let draftId: string;
let rootId: string;

async function register(email: string): Promise<{ agent: request.Agent; userId: string }> {
  const agent = request.agent(server);
  const res = await agent
    .post('/api/v1/auth/register')
    .send({ pdConsent: true, email, password: 'secret123' });
  return { agent, userId: (res.body as { data: { user: { id: string } } }).data.user.id };
}

beforeAll(async () => {
  const handle = await createTestDb();
  db = handle.db;
  close = handle.close;
  server = createServer(createApp({ db, config: loadConfig(), logger: createLogger('test') }));
  await new Promise<void>(resolve => {
    server.listen(0, resolve);
  });

  const sellers = new SellerRepository(db);
  const s = await register('pr-seller@x.test');
  seller = s.agent;
  const profile = await sellers.create({
    userId: s.userId,
    companyName: 'Станкоимпорт',
    verifyStatus: 'verified',
  });
  const o = await register('pr-other-seller@x.test');
  otherSeller = o.agent;
  await sellers.create({
    userId: o.userId,
    companyName: 'Другой магазин',
    verifyStatus: 'verified',
  });
  const b = await register('pr-buyer@x.test');
  buyer = b.agent;
  buyerUserId = b.userId;

  // Раздел с подразделом: товары лежат в подразделе, счётчик корня — по всему поддереву.
  const categories = new CategoryRepository(db);
  const root = await categories.create({
    slug: 'pr-root',
    nameRu: 'Оборудование для металла',
    depth: 0,
  });
  const child = await categories.create({
    slug: 'pr-child',
    nameRu: 'Станки',
    parentId: root.id,
    depth: 1,
  });
  await categories.create({ slug: 'pr-empty', nameRu: 'Пустой раздел', depth: 0 });
  rootId = root.id;

  const products = new ProductRepository(db);
  const base = { sellerId: profile.id, categoryId: child.id, stock: 0 };
  onRequestId = (
    await products.create({
      ...base,
      slug: 'pr-lathe',
      sku: 'PR-1',
      nameRu: 'Токарный станок',
      price: null,
      status: 'active',
    })
  ).id;
  pricedId = (
    await products.create({
      ...base,
      slug: 'pr-drill',
      sku: 'PR-2',
      nameRu: 'Сверлильный станок',
      price: '500.00',
      stock: 3,
      status: 'active',
    })
  ).id;
  await products.create({
    ...base,
    slug: 'pr-mill',
    sku: 'PR-3',
    nameRu: 'Фрезерный станок',
    price: '900.00',
    stock: 3,
    status: 'active',
  });
  draftId = (
    await products.create({
      ...base,
      slug: 'pr-draft',
      sku: 'PR-4',
      nameRu: 'Черновик',
      price: null,
      status: 'draft',
    })
  ).id;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });
  await close();
});

describe('запрос цены по товару «цена по запросу»', () => {
  let requestId: string;

  it('без входа — 401', async () => {
    const res = await request(server)
      .post(`/api/v1/catalog/products/${onRequestId}/price-requests`)
      .send({});
    expect(res.status).toBe(401);
  });

  it('количество 0 — 422', async () => {
    const res = await buyer
      .post(`/api/v1/catalog/products/${onRequestId}/price-requests`)
      .send({ qty: 0 });
    expect(res.status).toBe(422);
  });

  it('покупатель отправляет запрос, продавец получает уведомление', async () => {
    const res = await buyer
      .post(`/api/v1/catalog/products/${onRequestId}/price-requests`)
      .send({ qty: 2, comment: 'Нужна доставка в Казань', contactPhone: '+79991234567' });
    expect(res.status).toBe(201);
    requestId = res.body.data.id as string;

    const inbox = await seller.get('/api/v1/account/notifications');
    expect(inbox.status).toBe(200);
    const note = (
      inbox.body.data.items as { type: string; payload: Record<string, unknown> }[]
    ).find(n => n.type === 'price_request');
    expect(note?.payload.priceRequestId).toBe(requestId);
    expect(note?.payload.productName).toBe('Токарный станок');
  });

  it('повторный запрос, пока продавец не ответил, — 409 price_request_exists', async () => {
    const res = await buyer
      .post(`/api/v1/catalog/products/${onRequestId}/price-requests`)
      .send({ qty: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('price_request_exists');
  });

  it('продавец видит запрос с контактами покупателя', async () => {
    const res = await seller.get('/api/v1/seller/price-requests');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    const item = res.body.data.items[0];
    expect(item.id).toBe(requestId);
    expect(item.status).toBe('new');
    expect(item.qty).toBe(2);
    expect(item.contactPhone).toBe('+79991234567');
    expect(item.product.nameRu).toBe('Токарный станок');
    expect(item.buyer.email).toBe('pr-buyer@x.test');

    const filtered = await seller.get('/api/v1/seller/price-requests?status=closed');
    expect(filtered.body.data.total).toBe(0);
  });

  it('чужой продавец запрос не видит и статус не меняет', async () => {
    const list = await otherSeller.get('/api/v1/seller/price-requests');
    expect(list.body.data.total).toBe(0);
    const patch = await otherSeller
      .patch(`/api/v1/seller/price-requests/${requestId}`)
      .send({ status: 'closed' });
    expect(patch.status).toBe(404);
    expect(patch.body.error.code).toBe('price_request_not_found');
  });

  it('покупатель без магазина в кабинет продавца не попадает — 403', async () => {
    const res = await buyer.get('/api/v1/seller/price-requests');
    expect(res.status).toBe(403);
  });

  it('недопустимый статус — 422', async () => {
    const res = await seller
      .patch(`/api/v1/seller/price-requests/${requestId}`)
      .send({ status: 'paid' });
    expect(res.status).toBe(422);
  });

  it('после ответа продавца покупатель может спросить снова', async () => {
    const answered = await seller
      .patch(`/api/v1/seller/price-requests/${requestId}`)
      .send({ status: 'answered' });
    expect(answered.status).toBe(200);
    expect(answered.body.data.status).toBe('answered');

    const again = await buyer
      .post(`/api/v1/catalog/products/${onRequestId}/price-requests`)
      .send({ qty: 5 });
    expect(again.status).toBe(201);
    expect(again.body.data.id).not.toBe(requestId);
  });

  it('по своему товару — 409 own_product', async () => {
    const res = await seller
      .post(`/api/v1/catalog/products/${onRequestId}/price-requests`)
      .send({ qty: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('own_product');
  });

  it('у товара с ценой — 409 price_set', async () => {
    const res = await buyer
      .post(`/api/v1/catalog/products/${pricedId}/price-requests`)
      .send({ qty: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('price_set');
  });

  it('по неопубликованному товару — 404', async () => {
    const res = await buyer
      .post(`/api/v1/catalog/products/${draftId}/price-requests`)
      .send({ qty: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('product_not_found');
  });
});

describe('товар без цены не продаётся', () => {
  it('в корзину не кладётся — 409 price_on_request', async () => {
    const res = await buyer.post('/api/v1/cart/items').send({ productId: onRequestId, qty: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('price_on_request');
  });

  it('заказ с ним не оформляется, даже в обход корзины', async () => {
    const orders = new OrderRepository(db);
    await expect(
      orders.createWithItems({ buyerId: buyerUserId, items: [{ productId: onRequestId, qty: 1 }] })
    ).rejects.toSatisfy((e: unknown) => e instanceof OrderError && e.code === 'price_on_request');
  });
});

describe('каталог с товарами «по запросу»', () => {
  it('сортировка по цене ставит товары без цены в конец в обе стороны', async () => {
    const asc = await request(server).get(`/api/v1/catalog/products?sort=price_asc&pageSize=50`);
    expect(asc.status).toBe(200);
    expect((asc.body.data.items as { slug: string }[]).map(p => p.slug)).toEqual([
      'pr-drill',
      'pr-mill',
      'pr-lathe',
    ]);

    const desc = await request(server).get(`/api/v1/catalog/products?sort=price_desc&pageSize=50`);
    expect((desc.body.data.items as { slug: string }[]).map(p => p.slug)).toEqual([
      'pr-mill',
      'pr-drill',
      'pr-lathe',
    ]);
  });

  it('черновик на витрину не попадает — ни в список, ни по адресу', async () => {
    const listed = await request(server).get('/api/v1/catalog/products?status=draft&pageSize=50');
    expect(listed.status).toBe(200);
    expect((listed.body.data.items as { slug: string }[]).map(p => p.slug)).not.toContain(
      'pr-draft'
    );

    const direct = await request(server).get('/api/v1/catalog/products/pr-draft');
    expect(direct.status).toBe(404);
  });

  it('товар без цены отдаётся с price: null', async () => {
    const res = await request(server).get('/api/v1/catalog/products/pr-lathe');
    expect(res.status).toBe(200);
    expect(res.body.data.price).toBeNull();
  });

  it('дерево разделов считает активные товары по всему поддереву', async () => {
    const res = await request(server).get('/api/v1/catalog/categories');
    expect(res.status).toBe(200);
    const tree = res.body.data as {
      id: string;
      slug: string;
      productCount: number;
      children: { productCount: number }[];
    }[];
    const root = tree.find(c => c.id === rootId);
    expect(root?.productCount).toBe(3);
    expect(root?.children[0]?.productCount).toBe(3);
    expect(tree.find(c => c.slug === 'pr-empty')?.productCount).toBe(0);
  });
});
