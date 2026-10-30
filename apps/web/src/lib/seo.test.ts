import { describe, expect, it } from 'vitest';

import { absoluteUrl, breadcrumbJsonLd, productJsonLd, storeJsonLd } from './seo';

import type { ProductDto, StoreDto } from '@china-ru/shared';

const product: ProductDto = {
  id: '00000000-0000-0000-0000-000000000001',
  sellerId: '00000000-0000-0000-0000-000000000002',
  categoryId: '00000000-0000-0000-0000-000000000003',
  slug: 'cnc-router',
  sku: 'CNC-1',
  nameRu: 'ЧПУ-фрезер',
  nameEn: null,
  nameZh: null,
  descriptionRu: 'Описание',
  descriptionEn: null,
  descriptionZh: null,
  price: '1500.00',
  currency: 'rub',
  stock: 3,
  status: 'active',
  rating: '4.5',
  reviewCount: 12,
  tags: [],
  specs: [{ name: 'Мощность', value: '5,5 кВт' }],
  images: [{ id: 'i1', url: 'https://cdn.test/a.jpg', sort: 0, isPrimary: true }],
  createdAt: '2026-06-12T00:00:00.000Z',
  updatedAt: '2026-06-12T00:00:00.000Z',
};

const store: StoreDto = {
  id: '00000000-0000-0000-0000-000000000002',
  publicId: 1042,
  nickname: 'hongli',
  companyName: 'Hongli Machinery',
  companyNameZh: '宏力机械',
  description: 'Фрезерные станки с ЧПУ',
  bannerUrl: null,
  logoUrl: 'https://cdn.test/logo.png',
  rating: '4.8',
  reviewCount: 3,
  verified: true,
  productCount: 12,
  createdAt: '2025-10-15T00:00:00.000Z',
};

describe('seo helpers', () => {
  it('absoluteUrl prefixes the site origin', () => {
    expect(absoluteUrl('/ru/catalog')).toMatch(/\/ru\/catalog$/);
    expect(absoluteUrl('ru')).toContain('/ru');
  });

  it('productJsonLd builds a Schema.org Product with offer and rating', () => {
    const ld = productJsonLd(product, '/ru/catalog/cnc-router');
    expect(ld['@type']).toBe('Product');
    expect(ld.offers).toMatchObject({ price: '1500.00', priceCurrency: 'RUB' });
    expect(ld.aggregateRating).toMatchObject({ ratingValue: '4.5', reviewCount: 12 });
  });

  it('productJsonLd marks in-stock availability', () => {
    const ld = productJsonLd(product, '/ru/catalog/cnc-router');
    expect((ld.offers as { availability: string }).availability).toContain('InStock');
  });

  it('productJsonLd lists specs as additional properties', () => {
    const ld = productJsonLd(product, '/ru/catalog/cnc-router');
    expect(ld.additionalProperty).toEqual([
      { '@type': 'PropertyValue', name: 'Мощность', value: '5,5 кВт' },
    ]);
  });

  it('productJsonLd omits offers for a price-on-request product', () => {
    const ld = productJsonLd({ ...product, price: null }, '/ru/catalog/cnc-router');
    expect(ld).not.toHaveProperty('offers');
    expect(ld['@type']).toBe('Product');
    expect(ld.aggregateRating).toBeDefined();
  });

  it('storeJsonLd describes the seller as an Organization', () => {
    const ld = storeJsonLd(store, '/ru/store/hongli');
    expect(ld).toMatchObject({
      '@type': 'Organization',
      name: 'Hongli Machinery',
      alternateName: '宏力机械',
      logo: 'https://cdn.test/logo.png',
      description: 'Фрезерные станки с ЧПУ',
    });
    expect(ld.url).toMatch(/\/ru\/store\/hongli$/);
    expect(ld).not.toHaveProperty('image');
  });

  it('breadcrumbJsonLd numbers positions from 1', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Home', path: '/ru' },
      { name: 'Catalog', path: '/ru/catalog' },
    ]);
    const items = ld.itemListElement as { position: number }[];
    expect(items[0]?.position).toBe(1);
    expect(items[1]?.position).toBe(2);
  });
});
