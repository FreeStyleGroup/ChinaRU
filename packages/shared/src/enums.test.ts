import { describe, expect, it } from 'vitest';

import {
  ORDER_STATUSES,
  USER_ROLES,
  orderStatusSchema,
  productStatusSchema,
  userRoleSchema,
} from './enums';

describe('enums', () => {
  it('Zod enum accepts canonical values and rejects others', () => {
    expect(userRoleSchema.parse('seller')).toBe('seller');
    expect(userRoleSchema.safeParse('superuser').success).toBe(false);
    expect(productStatusSchema.safeParse('active').success).toBe(true);
  });

  it('enum options expose the underlying tuple', () => {
    expect(userRoleSchema.options).toEqual(USER_ROLES);
    expect(orderStatusSchema.options).toEqual(ORDER_STATUSES);
  });

  it('canonical tuples have the expected members', () => {
    expect(USER_ROLES).toEqual(['buyer', 'seller', 'admin']);
    expect(ORDER_STATUSES).toContain('refunded');
  });
});
