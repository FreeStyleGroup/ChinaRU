import {
  BOOKING_STATUSES,
  CURRENCIES,
  DEVICE_PLATFORMS,
  JOB_APPLICATION_STATUSES,
  JOB_STATUSES,
  JOB_WORK_TYPES,
  LOCALES,
  NOTIFICATION_TYPES,
  OAUTH_PROVIDERS,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  REVIEW_STATUSES,
  SELLER_VERIFY_STATUSES,
  USER_ROLES,
  USER_STATUSES,
} from '@china-ru/shared';
import { describe, expect, it } from 'vitest';

import * as e from './enums';

/**
 * Доказывает, что значения каждого pgEnum БД совпадают с каноническим кортежем
 * `@china-ru/shared` — БД и Zod-валидация физически синхронны.
 */
describe('db enums ↔ shared tuples', () => {
  it.each([
    [e.userRole, USER_ROLES],
    [e.userStatus, USER_STATUSES],
    [e.localeEnum, LOCALES],
    [e.currency, CURRENCIES],
    [e.oauthProvider, OAUTH_PROVIDERS],
    [e.sellerVerifyStatus, SELLER_VERIFY_STATUSES],
    [e.productStatus, PRODUCT_STATUSES],
    [e.orderStatus, ORDER_STATUSES],
    [e.reviewStatus, REVIEW_STATUSES],
    [e.jobWorkType, JOB_WORK_TYPES],
    [e.jobStatus, JOB_STATUSES],
    [e.jobApplicationStatus, JOB_APPLICATION_STATUSES],
    [e.bookingStatus, BOOKING_STATUSES],
    [e.notificationType, NOTIFICATION_TYPES],
    [e.devicePlatform, DEVICE_PLATFORMS],
  ])('%s pgEnum matches its shared tuple', (pgEnum, tuple) => {
    expect(pgEnum.enumValues).toEqual([...tuple]);
  });
});
