import { and, asc, eq, inArray, isNull, type SQL } from 'drizzle-orm';

import { dealerBrands, dealers, vehicleBrands } from '../schema';

import type { Database } from '../client';

export type Dealer = typeof dealers.$inferSelect;
export type NewDealer = typeof dealers.$inferInsert;

export interface DealerBrandInfo {
  id: string;
  slug: string;
  name: string;
}
export type DealerWithBrands = Dealer & { brands: DealerBrandInfo[] };

export class DealerRepository {
  constructor(private readonly db: Database) {}

  /** Дилеры с фильтром по городу и брендам (хотя бы один из выбранных). */
  async list(f: { city?: string; brandIds?: string[] } = {}): Promise<DealerWithBrands[]> {
    const conditions: SQL[] = [isNull(dealers.deletedAt)];
    if (f.city) conditions.push(eq(dealers.city, f.city));
    if (f.brandIds && f.brandIds.length > 0) {
      const matching = this.db
        .selectDistinct({ id: dealerBrands.dealerId })
        .from(dealerBrands)
        .where(inArray(dealerBrands.brandId, f.brandIds));
      conditions.push(inArray(dealers.id, matching));
    }
    const rows = await this.db
      .select()
      .from(dealers)
      .where(and(...conditions))
      .orderBy(asc(dealers.sort), asc(dealers.name));
    if (rows.length === 0) return [];

    const brandRows = await this.db
      .select({
        dealerId: dealerBrands.dealerId,
        id: vehicleBrands.id,
        slug: vehicleBrands.slug,
        name: vehicleBrands.name,
      })
      .from(dealerBrands)
      .innerJoin(vehicleBrands, eq(dealerBrands.brandId, vehicleBrands.id))
      .where(
        inArray(
          dealerBrands.dealerId,
          rows.map(r => r.id)
        )
      );
    const byDealer = new Map<string, DealerBrandInfo[]>();
    for (const b of brandRows) {
      const list = byDealer.get(b.dealerId) ?? [];
      list.push({ id: b.id, slug: b.slug, name: b.name });
      byDealer.set(b.dealerId, list);
    }
    return rows.map(d => ({ ...d, brands: byDealer.get(d.id) ?? [] }));
  }

  /** Список городов с дилерами (для выпадашки). */
  async cities(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ city: dealers.city })
      .from(dealers)
      .where(isNull(dealers.deletedAt))
      .orderBy(asc(dealers.city));
    return rows.map(r => r.city);
  }

  async create(data: NewDealer): Promise<Dealer> {
    const [row] = await this.db.insert(dealers).values(data).returning();
    if (!row) throw new Error('dealers.insert returned no row');
    return row;
  }

  async addBrand(dealerId: string, brandId: string): Promise<void> {
    await this.db.insert(dealerBrands).values({ dealerId, brandId }).onConflictDoNothing();
  }
}
