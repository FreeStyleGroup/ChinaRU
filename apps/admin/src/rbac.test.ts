import { describe, expect, it } from 'vitest';

import { canModerate } from './rbac';

describe('admin/rbac', () => {
  it('admin and moderator can moderate', () => {
    expect(canModerate('admin')).toBe(true);
    expect(canModerate('moderator')).toBe(true);
  });
});
