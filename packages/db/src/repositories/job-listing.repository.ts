import { and, count, desc, eq, ilike, isNull, type SQL } from 'drizzle-orm';

import { jobListings } from '../schema';

import type { Database } from '../client';

export type JobListing = typeof jobListings.$inferSelect;
export type NewJobListing = typeof jobListings.$inferInsert;
export type JobListingUpdate = Partial<
  Omit<NewJobListing, 'id' | 'sellerId' | 'createdAt' | 'updatedAt'>
>;

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
