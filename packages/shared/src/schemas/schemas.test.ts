import { describe, expect, it } from 'vitest';

import { fieldErrors } from '../common';
import { paginate, paginationQuerySchema } from '../pagination';

import { loginSchema, passwordResetConfirmSchema, registerSchema } from './auth';
import { createProductSchema, productListQuerySchema } from './catalog';
import { createOrderSchema } from './order';
import { createBookingSchema } from './travel';

describe('auth schemas', () => {
  it('register normalizes email (trim + lowercase) and requires strong password', () => {
    const parsed = registerSchema.parse({
      email: '  User@Example.COM ',
      password: 'secret123',
      pdConsent: true,
    });
    expect(parsed.email).toBe('user@example.com');
  });

  it('register rejects letters-only password', () => {
    const res = registerSchema.safeParse({
      email: 'a@b.co',
      password: 'onlyletters',
      pdConsent: true,
    });
    expect(res.success).toBe(false);
  });

  it('register requires consent to personal data processing', () => {
    for (const pdConsent of [undefined, false, 'true', 1]) {
      const res = registerSchema.safeParse({ email: 'a@b.co', password: 'secret123', pdConsent });
      expect(res.success).toBe(false);
      if (!res.success) expect(Object.keys(fieldErrors(res.error))).toContain('pdConsent');
    }
  });

  it('login requires a non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });

  it('password reset confirm needs token + strong password', () => {
    const res = passwordResetConfirmSchema.safeParse({ token: 'short', password: 'Abc12345' });
    expect(res.success).toBe(false);
  });
});

describe('catalog schemas', () => {
  it('accepts a valid product and rejects a bad slug', () => {
    const good = createProductSchema.safeParse({
      categoryId: '00000000-0000-0000-0000-000000000000',
      slug: 'cnc-router-1325',
      sku: 'SKU-1',
      nameRu: 'Станок',
      price: '149999.00',
      stock: 5,
    });
    expect(good.success).toBe(true);

    const bad = createProductSchema.safeParse({
      categoryId: '00000000-0000-0000-0000-000000000000',
      slug: 'Bad Slug!',
      sku: 'SKU-1',
      nameRu: 'Станок',
      price: '10',
      stock: 0,
    });
    expect(bad.success).toBe(false);
  });

  it('product list query coerces strings and applies defaults', () => {
    const q = productListQuerySchema.parse({ page: '2', pageSize: '50', minPrice: '100' });
    expect(q).toMatchObject({ page: 2, pageSize: 50, minPrice: 100, sort: 'newest' });
  });

  it('rejects money with too many decimals', () => {
    const res = createProductSchema.safeParse({
      categoryId: '00000000-0000-0000-0000-000000000000',
      slug: 'x',
      sku: 'S',
      nameRu: 'n',
      price: '10.999',
      stock: 0,
    });
    expect(res.success).toBe(false);
  });
});

describe('order schema', () => {
  it('rejects an empty order', () => {
    expect(createOrderSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it('accepts items with positive qty', () => {
    const res = createOrderSchema.safeParse({
      items: [{ productId: '00000000-0000-0000-0000-000000000000', qty: 2 }],
    });
    expect(res.success).toBe(true);
  });
});

describe('travel booking cross-field validation', () => {
  it('rejects endDate before startDate', () => {
    const res = createBookingSchema.safeParse({
      packageId: '00000000-0000-0000-0000-000000000000',
      startDate: '2026-07-10',
      endDate: '2026-07-01',
      passengers: 2,
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(fieldErrors(res.error)).toHaveProperty('endDate');
    }
  });
});

describe('pagination helper', () => {
  it('computes totalPages and echoes query', () => {
    const q = paginationQuerySchema.parse({ page: 1, pageSize: 20 });
    expect(paginate([1, 2, 3], 45, q)).toEqual({
      items: [1, 2, 3],
      page: 1,
      pageSize: 20,
      total: 45,
      totalPages: 3,
    });
  });
});

describe('fieldErrors', () => {
  it('maps a ZodError to one message per path', () => {
    const res = registerSchema.safeParse({ email: 'nope', password: 'x' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const f = fieldErrors(res.error);
      expect(Object.keys(f)).toEqual(expect.arrayContaining(['email', 'password']));
    }
  });
});
