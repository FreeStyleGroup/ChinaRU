import { and, desc, eq, isNull } from 'drizzle-orm';

import { jobApplications, jobListings, sellerProfiles, users } from '../schema';

import type { Database } from '../client';

export type JobApplication = typeof jobApplications.$inferSelect;
export type NewJobApplication = typeof jobApplications.$inferInsert;

/** Отклик соискателя + краткие данные вакансии (для списка «Мои отклики»). */
export interface ApplicationWithVacancy {
  id: string;
  status: JobApplication['status'];
  coverLetter: string | null;
  createdAt: Date;
  listingId: string;
  vacancyTitle: string;
  vacancyCity: string | null;
  companyName: string;
}

/** Отклик + краткие данные соискателя (для работодателя). */
export interface ApplicationWithApplicant {
  id: string;
  status: JobApplication['status'];
  coverLetter: string | null;
  createdAt: Date;
  applicantPublicId: number;
  applicantName: string | null;
}

export class JobApplicationRepository {
  constructor(private readonly db: Database) {}

  async existsFor(listingId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: jobApplications.id })
      .from(jobApplications)
      .where(and(eq(jobApplications.listingId, listingId), eq(jobApplications.userId, userId)))
      .limit(1);
    return row !== undefined;
  }

  async create(data: NewJobApplication): Promise<JobApplication> {
    const [row] = await this.db.insert(jobApplications).values(data).returning();
    if (!row) throw new Error('job_applications.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<JobApplication | null> {
    const [row] = await this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, id))
      .limit(1);
    return row ?? null;
  }

  async setStatus(id: string, status: JobApplication['status']): Promise<JobApplication | null> {
    const [row] = await this.db
      .update(jobApplications)
      .set({ status })
      .where(eq(jobApplications.id, id))
      .returning();
    return row ?? null;
  }

  /** Отклики соискателя с краткими данными вакансии и компании. */
  async listByUser(userId: string): Promise<ApplicationWithVacancy[]> {
    const rows = await this.db
      .select({
        id: jobApplications.id,
        status: jobApplications.status,
        coverLetter: jobApplications.coverLetter,
        createdAt: jobApplications.createdAt,
        listingId: jobApplications.listingId,
        vacancyTitle: jobListings.title,
        vacancyCity: jobListings.city,
        companyName: sellerProfiles.companyName,
      })
      .from(jobApplications)
      .innerJoin(jobListings, eq(jobApplications.listingId, jobListings.id))
      .innerJoin(sellerProfiles, eq(jobListings.sellerId, sellerProfiles.id))
      .where(eq(jobApplications.userId, userId))
      .orderBy(desc(jobApplications.createdAt));
    return rows;
  }

  /** Отклики на вакансию с краткими данными соискателей. */
  async listByListing(listingId: string): Promise<ApplicationWithApplicant[]> {
    const rows = await this.db
      .select({
        id: jobApplications.id,
        status: jobApplications.status,
        coverLetter: jobApplications.coverLetter,
        createdAt: jobApplications.createdAt,
        applicantPublicId: users.publicId,
        applicantName: users.name,
      })
      .from(jobApplications)
      .innerJoin(users, eq(jobApplications.userId, users.id))
      .where(and(eq(jobApplications.listingId, listingId), isNull(users.deletedAt)))
      .orderBy(desc(jobApplications.createdAt));
    return rows;
  }
}
