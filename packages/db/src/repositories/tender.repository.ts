import { and, count, desc, eq, ilike, isNull, ne, or, sql, type SQL } from 'drizzle-orm';

import { sellerProfiles, tenders } from '../schema';

import type { Database } from '../client';

export type Tender = typeof tenders.$inferSelect;
export type NewTender = typeof tenders.$inferInsert;

/** Краткая публичная карточка компании (заказчик/участник тендера). */
export interface CompanyRef {
  sellerId: string;
  publicId: number;
  companyName: string;
  nickname: string | null;
  verified: boolean;
  rating: string;
}

export type TenderWithCustomer = Tender & { customer: CompanyRef };

interface TenderListFilters {
  page?: number;
  limit?: number;
  method?: Tender['method'];
  law?: Tender['law'];
  status?: Tender['status'];
  region?: string;
  q?: string;
}

interface TenderJoinRow {
  tender: Tender;
  cPublicId: number;
  cCompanyName: string;
  cNickname: string | null;
  cVerifyStatus: string;
  cRating: string;
}

export class TenderRepository {
  constructor(private readonly db: Database) {}

  private base() {
    return this.db
      .select({
        tender: tenders,
        cPublicId: sellerProfiles.publicId,
        cCompanyName: sellerProfiles.companyName,
        cNickname: sellerProfiles.nickname,
        cVerifyStatus: sellerProfiles.verifyStatus,
        cRating: sellerProfiles.rating,
      })
      .from(tenders)
      .innerJoin(sellerProfiles, eq(tenders.customerSellerId, sellerProfiles.id));
  }

  private map(r: TenderJoinRow): TenderWithCustomer {
    return {
      ...r.tender,
      customer: {
        sellerId: r.tender.customerSellerId,
        publicId: r.cPublicId,
        companyName: r.cCompanyName,
        nickname: r.cNickname,
        verified: r.cVerifyStatus === 'verified',
        rating: r.cRating,
      },
    };
  }

  async create(data: NewTender): Promise<Tender> {
    const [row] = await this.db.insert(tenders).values(data).returning();
    if (!row) throw new Error('tenders.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<Tender | null> {
    const [row] = await this.db
      .select()
      .from(tenders)
      .where(and(eq(tenders.id, id), isNull(tenders.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async findWithCustomer(id: string): Promise<TenderWithCustomer | null> {
    const [row] = await this.base()
      .where(and(eq(tenders.id, id), isNull(tenders.deletedAt)))
      .limit(1);
    return row ? this.map(row) : null;
  }

  /** Публичный реестр: все опубликованные тендеры (кроме черновиков), с фильтрами. */
  async listPublic(f: TenderListFilters = {}): Promise<{ rows: TenderWithCustomer[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(50, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [isNull(tenders.deletedAt), ne(tenders.status, 'draft')];
    if (f.method) conditions.push(eq(tenders.method, f.method));
    if (f.law) conditions.push(eq(tenders.law, f.law));
    if (f.status) conditions.push(eq(tenders.status, f.status));
    if (f.region) conditions.push(ilike(tenders.region, `%${f.region}%`));
    if (f.q) {
      const term = `%${f.q}%`;
      const match = or(ilike(tenders.title, term), ilike(tenders.description, term));
      if (match) conditions.push(match);
    }
    return this.runList(and(...conditions), page, limit);
  }

  /** Все тендеры компании-заказчика (любой статус) — кабинет. */
  async listByCustomer(
    customerSellerId: string,
    f: { page?: number; limit?: number; status?: Tender['status'] } = {}
  ): Promise<{ rows: TenderWithCustomer[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(50, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [
      isNull(tenders.deletedAt),
      eq(tenders.customerSellerId, customerSellerId),
    ];
    if (f.status) conditions.push(eq(tenders.status, f.status));
    return this.runList(and(...conditions), page, limit);
  }

  private async runList(
    where: SQL | undefined,
    page: number,
    limit: number
  ): Promise<{ rows: TenderWithCustomer[]; total: number }> {
    const rows = await this.base()
      .where(where)
      .orderBy(desc(tenders.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(tenders).where(where);
    return { rows: rows.map(r => this.map(r)), total: agg?.value ?? 0 };
  }

  async update(id: string, patch: Partial<NewTender>): Promise<Tender | null> {
    const [row] = await this.db
      .update(tenders)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(tenders.id, id), isNull(tenders.deletedAt)))
      .returning();
    return row ?? null;
  }

  async incrementView(id: string): Promise<void> {
    await this.db
      .update(tenders)
      .set({ viewCount: sql`${tenders.viewCount} + 1` })
      .where(eq(tenders.id, id));
  }

  async adjustBidCount(id: string, delta: number): Promise<void> {
    await this.db
      .update(tenders)
      .set({ bidCount: sql`${tenders.bidCount} + ${delta}` })
      .where(eq(tenders.id, id));
  }

  async softDelete(id: string): Promise<void> {
    await this.db.update(tenders).set({ deletedAt: new Date() }).where(eq(tenders.id, id));
  }
}
