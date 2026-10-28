import { describe, expect, it } from 'vitest';

import { aggregateFulfillment } from './order';

describe('aggregateFulfillment', () => {
  it('пока хоть одна позиция собирается — заказ «собирается»', () => {
    expect(aggregateFulfillment(['delivered', 'processing', 'shipped'])).toBe('processing');
  });

  it('все позиции выданы — заказ выдан', () => {
    expect(aggregateFulfillment(['delivered', 'delivered'])).toBe('delivered');
  });

  it('отменённая позиция не тянет живой заказ в «отменён»', () => {
    expect(aggregateFulfillment(['cancelled', 'shipped'])).toBe('shipped');
  });

  it('«отменён» — только когда отменено всё', () => {
    expect(aggregateFulfillment(['cancelled', 'cancelled'])).toBe('cancelled');
  });
});
