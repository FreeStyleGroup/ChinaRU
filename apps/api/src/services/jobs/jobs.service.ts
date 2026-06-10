import { getDb, jobListings, users, sellerProfiles } from '@china-ru/db';
import { eq, and, isNull } from 'drizzle-orm';
import type { JobListingDto } from '@china-ru/shared';

export const jobsService = {
  list: async (sellerId?: string): Promise<JobListingDto[]> => {
    const db = getDb();
    let query = db.select({
      id: jobListings.id,
      sellerId: jobListings.sellerId,
      sellerName: sellerProfiles.companyName,
      title: jobListings.title,
      titleCn: jobListings.titleCn,
      description: jobListings.description,
      descriptionCn: jobListings.descriptionCn,
      salary: jobListings.salary,
      currency: jobListings.currency,
      hskLevel: jobListings.hskLevel,
      workType: jobListings.workType,
      status: jobListings.status,
      expiresAt: jobListings.expiresAt,
      createdAt: jobListings.createdAt,
    }).from(jobListings)
      .leftJoin(sellerProfiles, eq(jobListings.sellerId, sellerProfiles.userId));

    if (sellerId) {
      query = query.where(eq(jobListings.sellerId, sellerId));
    }

    const listings = await query;
    return listings.map(l => ({
      id: l.id,
      sellerId: l.sellerId,
      sellerName: l.sellerName || 'Unknown',
      title: l.title,
      titleCn: l.titleCn || undefined,
      description: l.description || undefined,
      descriptionCn: l.descriptionCn || undefined,
      salary: l.salary ? parseFloat(l.salary) : undefined,
      currency: l.currency,
      hskLevel: l.hskLevel || undefined,
      workType: l.workType,
      status: l.status || 'active',
      expiresAt: l.expiresAt ? l.expiresAt.toISOString() : undefined,
      createdAt: l.createdAt.toISOString(),
    }));
  },

  getById: async (id: string): Promise<JobListingDto | null> => {
    const db = getDb();
    const [listing] = await db.select({
      id: jobListings.id,
      sellerId: jobListings.sellerId,
      sellerName: sellerProfiles.companyName,
      title: jobListings.title,
      titleCn: jobListings.titleCn,
      description: jobListings.description,
      descriptionCn: jobListings.descriptionCn,
      salary: jobListings.salary,
      currency: jobListings.currency,
      hskLevel: jobListings.hskLevel,
      workType: jobListings.workType,
      status: jobListings.status,
      expiresAt: jobListings.expiresAt,
      createdAt: jobListings.createdAt,
    }).from(jobListings)
      .leftJoin(sellerProfiles, eq(jobListings.sellerId, sellerProfiles.userId))
      .where(eq(jobListings.id, id));

    if (!listing) return null;

    return {
      id: listing.id,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName || 'Unknown',
      title: listing.title,
      titleCn: listing.titleCn || undefined,
      description: listing.description || undefined,
      descriptionCn: listing.descriptionCn || undefined,
      salary: listing.salary ? parseFloat(listing.salary) : undefined,
      currency: listing.currency,
      hskLevel: listing.hskLevel || undefined,
      workType: listing.workType,
      status: listing.status || 'active',
      expiresAt: listing.expiresAt ? listing.expiresAt.toISOString() : undefined,
      createdAt: listing.createdAt.toISOString(),
    };
  },

  createBySeller: async (sellerId: string, data: {
    title: string;
    titleCn?: string;
    description?: string;
    descriptionCn?: string;
    salary?: number;
    currency: string;
    hskLevel?: string;
    workType: string;
    expiresAt?: Date;
  }): Promise<JobListingDto> => {
    const db = getDb();
    const [created] = await db.insert(jobListings).values({
      sellerId,
      title: data.title,
      titleCn: data.titleCn,
      description: data.description,
      descriptionCn: data.descriptionCn,
      salary: data.salary ? data.salary.toString() : undefined,
      currency: data.currency,
      hskLevel: data.hskLevel,
      workType: data.workType,
      status: 'active',
      expiresAt: data.expiresAt,
    }).returning();

    const sellerProfile = await db.query.sellerProfiles.findFirst({
      where: eq(sellerProfiles.userId, sellerId),
    });

    return {
      id: created.id,
      sellerId: created.sellerId,
      sellerName: sellerProfile?.companyName || 'Unknown',
      title: created.title,
      titleCn: created.titleCn || undefined,
      description: created.description || undefined,
      descriptionCn: created.descriptionCn || undefined,
      salary: created.salary ? parseFloat(created.salary) : undefined,
      currency: created.currency,
      hskLevel: created.hskLevel || undefined,
      workType: created.workType,
      status: created.status || 'active',
      expiresAt: created.expiresAt ? created.expiresAt.toISOString() : undefined,
      createdAt: created.createdAt.toISOString(),
    };
  },

  updateBySeller: async (id: string, sellerId: string, data: Partial<{
    title: string;
    titleCn?: string;
    description?: string;
    descriptionCn?: string;
    salary?: number;
    currency: string;
    hskLevel?: string;
    workType: string;
    status: string;
    expiresAt?: Date;
  }>): Promise<JobListingDto | null> => {
    const db = getDb();

    const existing = await db.query.jobListings.findFirst({
      where: and(eq(jobListings.id, id), eq(jobListings.sellerId, sellerId)),
    });

    if (!existing) return null;

    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.titleCn !== undefined) updateData.titleCn = data.titleCn;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.descriptionCn !== undefined) updateData.descriptionCn = data.descriptionCn;
    if (data.salary !== undefined) updateData.salary = data.salary.toString();
    if (data.currency) updateData.currency = data.currency;
    if (data.hskLevel !== undefined) updateData.hskLevel = data.hskLevel;
    if (data.workType) updateData.workType = data.workType;
    if (data.status) updateData.status = data.status;
    if (data.expiresAt) updateData.expiresAt = data.expiresAt;

    const [updated] = await db.update(jobListings)
      .set(updateData)
      .where(and(eq(jobListings.id, id), eq(jobListings.sellerId, sellerId)))
      .returning();

    return this.getById(id);
  },

  deleteBySeller: async (id: string, sellerId: string): Promise<boolean> => {
    const db = getDb();
    const result = await db.delete(jobListings)
      .where(and(eq(jobListings.id, id), eq(jobListings.sellerId, sellerId)));
    return true;
  },
};
