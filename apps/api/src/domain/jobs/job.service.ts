import { randomUUID } from 'node:crypto';

import { JOB_CATEGORIES, paginate } from '@china-ru/shared';

import { ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import {
  toApplicantDto,
  toJobListingDto,
  toJobListingPublicDto,
  toMyApplicationDto,
  toResumeDocumentDto,
  toResumeDto,
  toResumePublicDto,
} from '../dto';

import { computeResumeRating } from './resume-rating';

import type { UploadedFile } from '../../http/middleware/upload';
import type { Storage, StoredFile } from '../../storage/storage';
import type {
  JobApplicationRepository,
  JobListingRepository,
  ResumeDocumentRepository,
  ResumeRepository,
  SellerRepository,
} from '@china-ru/db';
import type {
  ApplicantDto,
  ApplyToJobInput,
  CreateJobListingInput,
  JobCategory,
  JobCategoryCount,
  JobListingDto,
  JobListingPublicDto,
  JobListQuery,
  MyApplicationDto,
  Paginated,
  ResumeDocumentDto,
  ResumeDto,
  ResumeListQuery,
  ResumePublicDto,
  UpdateApplicationStatusInput,
  UploadResumeDocumentInput,
  UpsertResumeInput,
} from '@china-ru/shared';

const VALID_CATEGORIES = new Set<string>(JOB_CATEGORIES);

/** Резюме, публичная витрина вакансий, размещение вакансий и отклики. */
export class JobService {
  constructor(
    private readonly resumes: ResumeRepository,
    private readonly listings: JobListingRepository,
    private readonly sellers: SellerRepository,
    private readonly applications: JobApplicationRepository,
    private readonly documents: ResumeDocumentRepository,
    private readonly storage: Storage
  ) {}

  /* ── Резюме ── */

  async getOwnResume(userId: string): Promise<ResumeDto | null> {
    const resume = await this.resumes.findByUserId(userId);
    return resume ? toResumeDto(resume) : null;
  }

  async upsertResume(userId: string, input: UpsertResumeInput): Promise<ResumeDto> {
    const resume = await this.resumes.upsert(userId, input);
    return toResumeDto(resume);
  }

  /* ── Документы резюме (диплом/сертификат/HSK) ── */

  async addResumeDocument(
    userId: string,
    input: UploadResumeDocumentInput,
    file: UploadedFile
  ): Promise<ResumeDocumentDto> {
    const resume = await this.resumes.findByUserId(userId);
    if (!resume) throw new NotFoundError('Сначала создайте резюме', 'resume_required');
    // Ключ объекта независим от id строки (рандомный) — упрощает запись одним шагом.
    const fileKey = `resume-docs/${resume.id}/${randomUUID()}`;
    await this.storage.put(fileKey, file.buffer, file.mimetype);
    const doc = await this.documents.create({
      resumeId: resume.id,
      type: input.type,
      fileKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
    return toResumeDocumentDto(doc);
  }

  async listResumeDocuments(userId: string): Promise<ResumeDocumentDto[]> {
    const resume = await this.resumes.findByUserId(userId);
    if (!resume) return [];
    const docs = await this.documents.listByResume(resume.id);
    return docs.map(toResumeDocumentDto);
  }

  async deleteResumeDocument(userId: string, documentId: string): Promise<void> {
    const doc = await this.requireOwnDocument(userId, documentId);
    await this.storage.delete(doc.fileKey);
    await this.documents.delete(documentId);
    await this.recomputeResumeRating(doc.resumeId);
  }

  /** Отдаёт содержимое документа владельцу резюме (для приватного скачивания). */
  async downloadResumeDocument(
    userId: string,
    documentId: string
  ): Promise<{ file: StoredFile; fileName: string }> {
    const doc = await this.requireOwnDocument(userId, documentId);
    const file = await this.storage.get(doc.fileKey);
    if (!file) throw new NotFoundError('Файл не найден', 'file_not_found');
    return { file, fileName: doc.fileName };
  }

  private async requireOwnDocument(userId: string, documentId: string) {
    const resume = await this.resumes.findByUserId(userId);
    if (!resume) throw new NotFoundError('Документ не найден', 'document_not_found');
    const doc = await this.documents.findById(documentId);
    // Два if (а не `!doc || doc.x`): иначе eslint prefer-optional-chain + TS не сужает null.
    if (!doc) throw new NotFoundError('Документ не найден', 'document_not_found');
    if (doc.resumeId !== resume.id) {
      throw new NotFoundError('Документ не найден', 'document_not_found');
    }
    return doc;
  }

  /** Пересчитывает рейтинг по числу подтверждённых документов резюме. */
  private async recomputeResumeRating(resumeId: string): Promise<void> {
    const verified = await this.documents.countVerified(resumeId);
    await this.resumes.setRating(resumeId, computeResumeRating(verified));
  }

  /* ── Публичная база резюме (для работодателей) ── */

  async listPublishedResumes(query: ResumeListQuery): Promise<Paginated<ResumePublicDto>> {
    const { rows, total } = await this.resumes.listPublic({
      page: query.page,
      limit: query.pageSize,
      ...(query.category ? { category: query.category } : {}),
      ...(query.experience ? { experience: query.experience } : {}),
      ...(query.hskLevel ? { hskLevel: query.hskLevel } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    return paginate(rows.map(toResumePublicDto), total, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async getPublicResume(id: string): Promise<ResumePublicDto> {
    const found = await this.resumes.findPublicById(id);
    if (!found) throw new NotFoundError('Резюме не найдено', 'resume_not_found');
    return toResumePublicDto(found);
  }

  /* ── Публичная витрина вакансий ── */

  async listPublishedVacancies(query: JobListQuery): Promise<Paginated<JobListingPublicDto>> {
    const { rows, total } = await this.listings.listPublic({
      page: query.page,
      limit: query.pageSize,
      ...(query.category ? { category: query.category } : {}),
      ...(query.workType ? { workType: query.workType } : {}),
      ...(query.city ? { city: query.city } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    return paginate(rows.map(toJobListingPublicDto), total, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async getPublicVacancy(id: string): Promise<JobListingPublicDto> {
    const found = await this.listings.findPublicById(id);
    if (!found) throw new NotFoundError('Вакансия не найдена', 'vacancy_not_found');
    return toJobListingPublicDto(found);
  }

  async categoryCounts(): Promise<JobCategoryCount[]> {
    const rows = await this.listings.countByCategory();
    return rows
      .filter((r): r is { category: JobCategory; count: number } =>
        r.category !== null && VALID_CATEGORIES.has(r.category)
      )
      .map(r => ({ category: r.category, count: r.count }));
  }

  /* ── Вакансии компании ── */

  async createVacancy(userId: string, input: CreateJobListingInput): Promise<JobListingDto> {
    const seller = await this.sellers.findByUserId(userId);
    const notVerified = 'Размещать вакансии может только подтверждённая компания';
    if (!seller) throw new ForbiddenError(notVerified, 'seller_not_verified');
    if (seller.verifyStatus !== 'verified') {
      throw new ForbiddenError(notVerified, 'seller_not_verified');
    }
    const created = await this.listings.create({
      sellerId: seller.id,
      title: input.title,
      description: input.description,
      workType: input.workType,
      moderationStatus: 'pending',
      ...(input.category ? { category: input.category } : {}),
      ...(input.salaryMin !== undefined ? { salaryMin: input.salaryMin } : {}),
      ...(input.salaryMax !== undefined ? { salaryMax: input.salaryMax } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.hskLevel !== undefined ? { hskLevel: input.hskLevel } : {}),
      ...(input.city ? { city: input.city } : {}),
      ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt) } : {}),
    });
    return toJobListingDto(created);
  }

  async myVacancies(userId: string): Promise<JobListingDto[]> {
    const seller = await this.sellers.findByUserId(userId);
    if (!seller) throw new NotFoundError('Профиль продавца не найден', 'seller_not_found');
    const { rows } = await this.listings.list({ sellerId: seller.id, limit: 100 });
    return rows.map(toJobListingDto);
  }

  /* ── Отклики ── */

  async apply(userId: string, listingId: string, input: ApplyToJobInput): Promise<{ id: string }> {
    const vacancy = await this.listings.findPublicById(listingId);
    if (!vacancy) throw new NotFoundError('Вакансия не найдена', 'vacancy_not_found');
    if (await this.applications.existsFor(listingId, userId)) {
      throw new ConflictError('Вы уже откликнулись на эту вакансию', 'already_applied');
    }
    const created = await this.applications.create({
      listingId,
      userId,
      coverLetter: input.coverLetter ?? null,
    });
    return { id: created.id };
  }

  async myApplications(userId: string): Promise<MyApplicationDto[]> {
    const rows = await this.applications.listByUser(userId);
    return rows.map(toMyApplicationDto);
  }

  /** Отклики на вакансию компании (только владелец вакансии). */
  async listingApplicants(userId: string, listingId: string): Promise<ApplicantDto[]> {
    await this.assertOwnsListing(userId, listingId);
    const rows = await this.applications.listByListing(listingId);
    return rows.map(toApplicantDto);
  }

  async setApplicationStatus(
    userId: string,
    applicationId: string,
    input: UpdateApplicationStatusInput
  ): Promise<{ id: string; status: string }> {
    const application = await this.applications.findById(applicationId);
    if (!application) throw new NotFoundError('Отклик не найден', 'application_not_found');
    await this.assertOwnsListing(userId, application.listingId);
    const updated = await this.applications.setStatus(applicationId, input.status);
    if (!updated) throw new NotFoundError('Отклик не найден', 'application_not_found');
    return { id: updated.id, status: updated.status };
  }

  private async assertOwnsListing(userId: string, listingId: string): Promise<void> {
    const seller = await this.sellers.findByUserId(userId);
    if (!seller) throw new ForbiddenError('Недостаточно прав', 'forbidden');
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ForbiddenError('Недостаточно прав', 'forbidden');
    if (listing.sellerId !== seller.id) throw new ForbiddenError('Недостаточно прав', 'forbidden');
  }
}
