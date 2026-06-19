import { and, asc, count, desc, eq, ne } from 'drizzle-orm';

import { sellerProfiles, tenderBids, tenders } from '../schema';

import type { Database } from '../client';
import type { CompanyRef } from './tender.repository';

export type TenderBid = typeof tenderBids.$inferSelect;
export type NewTenderBid = typeof tenderBids.$inferInsert;

export type BidWithBidder = TenderBid & { bidder: CompanyRef };

/** Заявка участника + краткая сводка по тендеру — для раздела «Мои заявки». */
export type MyBid = BidWithBidder & {
  tenderRegistryNumber: number;
  tenderTitle: string;
  tenderStatus: typeof tenders.$inferSelect.status;
};

interface BidJoinRow {
  bid: TenderBid;
  bPublicId: number;
  bCompanyName: string;
  bNickname: string | null;
  bVerifyStatus: string;
  bRating: string;
}

export class TenderBidRepository {
  constructor(private readonly db: Database) {}

  private base() {
    return this.db
      .select({
        bid: tenderBids,
        bPublicId: sellerProfiles.publicId,
        bCompanyName: sellerProfiles.companyName,
        bNickname: sellerProfiles.nickname,
        bVerifyStatus: sellerProfiles.verifyStatus,
        bRating: sellerProfiles.rating,
      })
      .from(tenderBids)
      .innerJoin(sellerProfiles, eq(tenderBids.bidderSellerId, sellerProfiles.id));
  }

  private bidder(r: BidJoinRow): CompanyRef {
    return {
      sellerId: r.bid.bidderSellerId,
      publicId: r.bPublicId,
      companyName: r.bCompanyName,
      nickname: r.bNickname,
      verified: r.bVerifyStatus === 'verified',
      rating: r.bRating,
    };
  }

  private map(r: BidJoinRow): BidWithBidder {
    return { ...r.bid, bidder: this.bidder(r) };
  }

  async create(data: NewTenderBid): Promise<TenderBid> {
    const [row] = await this.db.insert(tenderBids).values(data).returning();
    if (!row) throw new Error('tender_bids.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<TenderBid | null> {
    const [row] = await this.db.select().from(tenderBids).where(eq(tenderBids.id, id)).limit(1);
    return row ?? null;
  }

  async findWithBidder(id: string): Promise<BidWithBidder | null> {
    const [row] = await this.base().where(eq(tenderBids.id, id)).limit(1);
    return row ? this.map(row) : null;
  }

  async findByTenderAndBidder(tenderId: string, bidderSellerId: string): Promise<TenderBid | null> {
    const [row] = await this.db
      .select()
      .from(tenderBids)
      .where(and(eq(tenderBids.tenderId, tenderId), eq(tenderBids.bidderSellerId, bidderSellerId)))
      .limit(1);
    return row ?? null;
  }

  /** Заявки тендера (для заказчика) — по возрастанию цены (ранжирование как в аукционе). */
  async listByTender(tenderId: string): Promise<BidWithBidder[]> {
    const rows = await this.base()
      .where(eq(tenderBids.tenderId, tenderId))
      .orderBy(asc(tenderBids.price));
    return rows.map(r => this.map(r));
  }

  /** Активные (не отозванные) заявки тендера — для подведения итогов. */
  async listActiveByTender(tenderId: string): Promise<TenderBid[]> {
    return this.db
      .select()
      .from(tenderBids)
      .where(and(eq(tenderBids.tenderId, tenderId), ne(tenderBids.status, 'withdrawn')));
  }

  async update(id: string, patch: Partial<NewTenderBid>): Promise<TenderBid | null> {
    const [row] = await this.db
      .update(tenderBids)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tenderBids.id, id))
      .returning();
    return row ?? null;
  }

  /** «Мои заявки» участника: заявка + сводка по тендеру. */
  async listByBidder(
    bidderSellerId: string,
    page = 1,
    limit = 20
  ): Promise<{ rows: MyBid[]; total: number }> {
    const p = Math.max(1, page);
    const l = Math.min(50, Math.max(1, limit));
    const rows = await this.db
      .select({
        bid: tenderBids,
        bPublicId: sellerProfiles.publicId,
        bCompanyName: sellerProfiles.companyName,
        bNickname: sellerProfiles.nickname,
        bVerifyStatus: sellerProfiles.verifyStatus,
        bRating: sellerProfiles.rating,
        tRegistryNumber: tenders.registryNumber,
        tTitle: tenders.title,
        tStatus: tenders.status,
      })
      .from(tenderBids)
      .innerJoin(sellerProfiles, eq(tenderBids.bidderSellerId, sellerProfiles.id))
      .innerJoin(tenders, eq(tenderBids.tenderId, tenders.id))
      .where(eq(tenderBids.bidderSellerId, bidderSellerId))
      .orderBy(desc(tenderBids.createdAt))
      .limit(l)
      .offset((p - 1) * l);
    const [agg] = await this.db
      .select({ value: count() })
      .from(tenderBids)
      .where(eq(tenderBids.bidderSellerId, bidderSellerId));
    return {
      rows: rows.map(r => ({
        ...this.map(r),
        tenderRegistryNumber: r.tRegistryNumber,
        tenderTitle: r.tTitle,
        tenderStatus: r.tStatus,
      })),
      total: agg?.value ?? 0,
    };
  }
}
