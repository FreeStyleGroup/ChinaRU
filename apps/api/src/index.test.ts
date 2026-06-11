import { describe, expect, it } from 'vitest';

import { healthPayload } from './index';

describe('healthPayload', () => {
  it('returns an ok envelope for the api service', () => {
    const res = healthPayload();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({ status: 'ok', service: 'api' });
    }
  });
});
