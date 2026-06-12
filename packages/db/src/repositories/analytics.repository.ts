import { count, eq, inArray, isNull, sql } from 'drizzle-orm';

import { orders, products, reviews, sellerProfiles, users } from '../schema';

import type { Database } from '../client';

export interface AdminSummary {
  users: number;
  products: number;
  orders: number;
  pendingSellers: number;
  pendingReviews: number;
  /** Оборот по оплаченным/отгруженным/доставленным заказам, строкой. */
  gmv: string;
}

/** Агрегаты для дашборда админки (только чтение). */
export class AnalyticsRepository {
  constructor(private readonly db: Database) {}

  async summary(): Promise<AdminSummary> {
    const [usersAgg] = await this.db
      .select({ value: count() })
      .from(users)
      .where(isNull(users.deletedAt));
    const [productsAgg] = await this.db
      .select({ value: count() })
      .from(products)
      .where(isNull(products.deletedAt));
    const [ordersAgg] = await this.db
      .select({ value: count() })
      .from(orders)
      .where(isNull(orders.deletedAt));
    const [pendingSellersAgg] = await this.db
      .select({ value: count() })
      .from(sellerProfiles)
      .where(eq(sellerProfiles.verifyStatus, 'pending'));
    const [pendingReviewsAgg] = await this.db
      .select({ value: count() })
      .from(reviews)
      .where(eq(reviews.status, 'pending'));
    const [gmvAgg] = await this.db
      .select({ value: sql<string>`coalesce(sum(${orders.totalAmount}), 0)` })
      .from(orders)
      .where(inArray(orders.status, ['paid', 'shipped', 'delivered']));

    return {
      users: usersAgg?.value ?? 0,
      products: productsAgg?.value ?? 0,
      orders: ordersAgg?.value ?? 0,
      pendingSellers: pendingSellersAgg?.value ?? 0,
      pendingReviews: pendingReviewsAgg?.value ?? 0,
      gmv: gmvAgg?.value ?? '0',
    };
  }
}
