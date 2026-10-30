import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isUniqueViolation } from '../errors';
import { createTestDb } from '../testing/pglite';

import { CategoryRepository } from './category.repository';
import { OrderError, OrderRepository } from './order.repository';
import { ProductImageRepository } from './product-image.repository';
import { ProductRepository } from './product.repository';
import { SellerRepository } from './seller.repository';
import { UserRepository } from './user.repository';

import type { DbHandle } from '../client';

let handle: DbHandle;

beforeEach(async () => {
  handle = await createTestDb();
});

afterEach(async () => {
  await handle.close();
});

function repos() {
  const { db } = handle;
  return {
    users: new UserRepository(db),
    sellers: new SellerRepository(db),
    categories: new CategoryRepository(db),
    products: new ProductRepository(db),
    orders: new OrderRepository(db),
  };
}

async function baseFixtures() {
  const { users, sellers, categories } = repos();
  const sellerUser = await users.create({
    email: 'seller@china-ru.test',
    passwordHash: 'hash',
    role: 'seller',
  });
  const seller = await sellers.create({ userId: sellerUser.id, companyName: 'ACME Trade' });
  const category = await categories.create({ slug: 'electronics', nameRu: 'Электроника' });
  return { sellerUser, seller, category };
}

describe('UserRepository', () => {
  it('creates, finds by email, and respects soft-delete', async () => {
    const { users } = repos();
    const user = await users.create({ email: 'a@b.test', passwordHash: 'h' });

    expect(await users.findByEmail('a@b.test')).not.toBeNull();

    expect(await users.softDelete(user.id)).toBe(true);
    expect(await users.findById(user.id)).toBeNull();
    expect(await users.findByEmail('a@b.test')).toBeNull();
    // повторное удаление уже удалённого — false (а не всегда true, как в Haiku)
    expect(await users.softDelete(user.id)).toBe(false);
  });
});

describe('CategoryRepository', () => {
  it('creates roots and children and finds by slug', async () => {
    const { categories } = repos();
    const root = await categories.create({ slug: 'root', nameRu: 'Корень' });
    await categories.create({ slug: 'child', nameRu: 'Потомок', parentId: root.id });

    expect((await categories.findBySlug('root'))?.id).toBe(root.id);
    expect(await categories.listChildren(root.id)).toHaveLength(1);
    expect(await categories.listChildren(null)).toHaveLength(1);
  });
});

describe('ProductRepository.list', () => {
  it('applies the SAME filters to rows and to the total count', async () => {
    const { products } = repos();
    const { seller, category } = await baseFixtures();

    const make = (sku: string, price: string, status: 'active' | 'draft', name: string) =>
      products.create({
        sellerId: seller.id,
        categoryId: category.id,
        slug: `p-${sku}`,
        sku,
        nameRu: name,
        price,
        status,
        stock: 10,
      });

    await make('A', '100.00', 'active', 'Телефон');
    await make('B', '300.00', 'active', 'Ноутбук');
    await make('C', '200.00', 'draft', 'Черновик');

    const active = await products.list({ status: 'active' });
    expect(active.total).toBe(2);
    expect(active.rows).toHaveLength(2);

    const expensive = await products.list({ status: 'active', minPrice: 150 });
    expect(expensive.total).toBe(1);
    expect(expensive.rows[0]?.sku).toBe('B');

    const search = await products.list({ search: 'Телеф' });
    expect(search.total).toBe(1);

    const sorted = await products.list({ status: 'active', sortBy: 'price_asc' });
    expect(sorted.rows.map(r => r.sku)).toEqual(['A', 'B']);
  });

  it('paginates with correct page count', async () => {
    const { products } = repos();
    const { seller, category } = await baseFixtures();
    for (const sku of ['A', 'B', 'C']) {
      await products.create({
        sellerId: seller.id,
        categoryId: category.id,
        slug: `p-${sku}`,
        sku,
        nameRu: sku,
        price: '10.00',
        status: 'active',
      });
    }
    const firstPage = await products.list({ status: 'active', page: 1, limit: 2 });
    expect(firstPage.rows).toHaveLength(2);
    expect(firstPage.total).toBe(3);
    expect(firstPage.pages).toBe(2);
  });

  it('enforces seller ownership on update and soft-delete', async () => {
    const { products } = repos();
    const { seller, category } = await baseFixtures();
    const product = await products.create({
      sellerId: seller.id,
      categoryId: category.id,
      slug: 'p-own',
      sku: 'OWN',
      nameRu: 'Товар',
      price: '50.00',
    });

    const otherSeller = '00000000-0000-0000-0000-000000000000';
    expect(await products.updateOwned(product.id, otherSeller, { stock: 5 })).toBeNull();
    expect(await products.softDeleteOwned(product.id, otherSeller)).toBe(false);

    const updated = await products.updateOwned(product.id, seller.id, { stock: 7 });
    expect(updated?.stock).toBe(7);
  });
});

describe('ProductRepository.createWithImages', () => {
  it('записывает товар и фото вместе; при занятом слаге — ни товара, ни фото', async () => {
    const { seller, category } = await baseFixtures();
    const { products } = repos();
    const images = new ProductImageRepository(handle.db);
    const base = { sellerId: seller.id, categoryId: category.id, nameRu: 'Станок', price: null };
    const photos = [
      { url: 'https://x.test/1', sort: 0, isPrimary: true },
      { url: 'https://x.test/2', sort: 1, isPrimary: false },
    ];

    const created = await products.createWithImages({ ...base, slug: 'lathe', sku: 'L-1' }, photos);
    expect((await images.listByProduct(created.id)).map(i => i.url)).toEqual([
      'https://x.test/1',
      'https://x.test/2',
    ]);

    // Слаг занят, даже если товар удалён: уникальный индекс видит и удалённые.
    await products.softDeleteOwned(created.id, seller.id);
    const failed = await products
      .createWithImages({ ...base, slug: 'lathe', sku: 'L-2' }, photos)
      .catch((error: unknown) => error);
    expect(isUniqueViolation(failed, 'products_slug_uidx')).toBe(true);
    expect(isUniqueViolation(failed, 'products_seller_sku_uidx')).toBe(false);
    expect(await products.findBySellerSku(seller.id, 'L-2')).toBeNull();
  });
});

describe('OrderRepository.createWithItems', () => {
  it('creates an order, snapshots price and decrements stock in one transaction', async () => {
    const { products, users, orders } = repos();
    const { seller, category } = await baseFixtures();
    const buyer = await users.create({ email: 'buyer@china-ru.test', passwordHash: 'h' });
    const product = await products.create({
      sellerId: seller.id,
      categoryId: category.id,
      slug: 'p-order',
      sku: 'ORD',
      nameRu: 'Заказной товар',
      price: '100.00',
      status: 'active',
      stock: 5,
    });

    const order = await orders.createWithItems({
      buyerId: buyer.id,
      items: [{ productId: product.id, qty: 2 }],
    });

    expect(order.totalAmount).toBe('200.00');
    expect((await products.findById(product.id))?.stock).toBe(3);
    expect(await orders.listItems(order.id)).toHaveLength(1);
  });

  it('rolls back the whole transaction when stock is insufficient', async () => {
    const { products, users, orders } = repos();
    const { seller, category } = await baseFixtures();
    const buyer = await users.create({ email: 'buyer2@china-ru.test', passwordHash: 'h' });
    const product = await products.create({
      sellerId: seller.id,
      categoryId: category.id,
      slug: 'p-low',
      sku: 'LOW',
      nameRu: 'Мало на складе',
      price: '100.00',
      status: 'active',
      stock: 1,
    });

    await expect(
      orders.createWithItems({ buyerId: buyer.id, items: [{ productId: product.id, qty: 99 }] })
    ).rejects.toBeInstanceOf(OrderError);

    // Сток не изменился — транзакция откатилась.
    expect((await products.findById(product.id))?.stock).toBe(1);
    expect(await orders.listByBuyer(buyer.id)).toHaveLength(0);
  });
});
