import { paginate } from '@china-ru/shared';

import { ForbiddenError, NotFoundError } from '../../http/errors';
import { toJobListingDto, toResumeDto } from '../dto';

import type {
  JobListingRepository,
  ResumeRepository,
  SellerRepository,
} from '@china-ru/db';
import type {
  CreateJobListingInput,
  JobListingDto,
  JobListQuery,
  Paginated,
  ResumeDto,
  UpsertResumeInput,
} from '@china-ru/shared';

/** Резюме соискателя (own) + публичные вакансии + размещение вакансии компанией. */
export class JobService {
  constructor(
    private readonly resumes: ResumeRepository,
    private readonly listings: JobListingRepository,
    private readonly sellers: SellerRepository
  ) {}

  async getOwnResume(userId: string): Promise<ResumeDto | null> {
    const resume = await this.resumes.findByUserId(userId);
    return resume ? toResumeDto(resume) : null;
  }

  /** Создаёт/обновляет резюме; любое изменение возвращает его на модерацию. */
  async upsertResume(userId: string, input: UpsertResumeInput): Promise<ResumeDto> {
    const resume = await this.resumes.upsert(userId, input);
    return toResumeDto(resume);
  }

  /** Публичный листинг — только опубликованные модератором вакансии. */
  async listPublishedVacancies(query: JobListQuery): Promise<Paginated<JobListingDto>> {
    const { rows, total } = await this.listings.list({
      page: query.page,
      limit: query.pageSize,
      moderationStatus: 'published',
      ...(query.workType ? { workType: query.workType } : {}),
      ...(query.city ? { city: query.city } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    return paginate(rows.map(toJobListingDto), total, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /** Компания размещает вакансию → она уходит на модерацию (pending). */
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
}
