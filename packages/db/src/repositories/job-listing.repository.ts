import { and, count, desc, eq, ilike, isNull, type SQL } from 'drizzle-orm';

import { jobListings, sellerProfiles } from '../schema';

import type { Database } from '../client';

export type JobListing = typeof jobListings.$inferSelect;
export type NewJobListing = typeof jobListings.$inferInsert;
export type JobListingUpdate = Partial<
  Omit<NewJobListing, 'id' | 'sellerId' | 'createdAt' | 'updatedAt'>
>;

/** Вакансия + публичные данные компании (для витрины/детали). */
export type JobListingWithCompany = JobListing & {
  companyName: string;
  companyPublicId: number;
  companyVerified: boolean;
  companyRating: string;
};

export interface JobListingFilters {
  page?: number;
  limit?: number;
  moderationStatus?: JobListing['moderationStatus'];
  category?: JobListing['category'];
  workType?: JobListing['workType'];
  city?: string;
  search?: string;
  sellerId?: string;
}

export class JobListingRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewJobListing): Promise<JobListing> {
    const [row] = await this.db.insert(jobListings).values(data).returning();
    if (!row) throw new Error('job_listings.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<JobListing | null> {
    const [row] = await this.db
      .select()
      .from(jobListings)
      .where(and(eq(jobListings.id, id), isNull(jobListings.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async setModeration(
    id: string,
    status: JobListing['moderationStatus'],
    rejectionReason: string | null,
    publishedAt: Date | null
  ): Promise<JobListing | null> {
    const [row] = await this.db
      .update(jobListings)
      .set({ moderationStatus: status, rejectionReason, publishedAt })
      .where(and(eq(jobListings.id, id), isNull(jobListings.deletedAt)))
      .returning();
    return row ?? null;
  }

  private conditions(f: JobListingFilters): SQL[] {
    const c: SQL[] = [isNull(jobListings.deletedAt)];
    if (f.moderationStatus) c.push(eq(jobListings.moderationStatus, f.moderationStatus));
    if (f.category) c.push(eq(jobListings.category, f.category));
    if (f.workType) c.push(eq(jobListings.workType, f.workType));
    if (f.city) c.push(eq(jobListings.city, f.city));
    if (f.sellerId) c.push(eq(jobListings.sellerId, f.sellerId));
    if (f.search) c.push(ilike(jobListings.title, `%${f.search}%`));
    return c;
  }

  private withCompany() {
    return this.db
      .select({
        listing: jobListings,
        companyName: sellerProfiles.companyName,
        companyPublicId: sellerProfiles.publicId,
        companyVerifyStatus: sellerProfiles.verifyStatus,
        companyRating: sellerProfiles.rating,
      })
      .from(jobListings)
      .innerJoin(sellerProfiles, eq(jobListings.sellerId, sellerProfiles.id));
  }

  private mapCompany(r: {
    listing: JobListing;
    companyName: string;
    companyPublicId: number;
    companyVerifyStatus: string;
    companyRating: string;
  }): JobListingWithCompany {
    return {
      ...r.listing,
      companyName: r.companyName,
      companyPublicId: r.companyPublicId,
      companyVerified: r.companyVerifyStatus === 'verified',
      companyRating: r.companyRating,
    };
  }

  /** Публичная витрина — только опубликованные вакансии, с данными компании. */
  async listPublic(
    f: JobListingFilters = {}
  ): Promise<{ rows: JobListingWithCompany[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const conditions: SQL[] = [
      isNull(jobListings.deletedAt),
      eq(jobListings.moderationStatus, 'published'),
    ];
    if (f.category) conditions.push(eq(jobListings.category, f.category));
    if (f.workType) conditions.push(eq(jobListings.workType, f.workType));
    if (f.city) conditions.push(eq(jobListings.city, f.city));
    if (f.search) conditions.push(ilike(jobListings.title, `%${f.search}%`));
    const where = and(...conditions);

    const rows = await this.withCompany()
      .where(where)
      .orderBy(desc(jobListings.publishedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(jobListings).where(where);
    return { rows: rows.map(r => this.mapCompany(r)), total: agg?.value ?? 0 };
  }

  async findPublicById(id: string): Promise<JobListingWithCompany | null> {
    const [row] = await this.withCompany()
      .where(
        and(
          eq(jobListings.id, id),
          isNull(jobListings.deletedAt),
          eq(jobListings.moderationStatus, 'published')
        )
      )
      .limit(1);
    return row ? this.mapCompany(row) : null;
  }

  /** Кол-во опубликованных вакансий по каждой категории (для витрины). */
  async countByCategory(): Promise<{ category: string | null; count: number }[]> {
    const rows = await this.db
      .select({ category: jobListings.category, value: count() })
      .from(jobListings)
      .where(and(isNull(jobListings.deletedAt), eq(jobListings.moderationStatus, 'published')))
      .groupBy(jobListings.category);
    return rows.map(r => ({ category: r.category, count: r.value }));
  }

  async list(f: JobListingFilters = {}): Promise<{ rows: JobListing[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const where = and(...this.conditions(f));

    const rows = await this.db
      .select()
      .from(jobListings)
      .where(where)
      .orderBy(desc(jobListings.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(jobListings).where(where);
    return { rows, total: agg?.value ?? 0 };
  }
}
