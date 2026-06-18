import { z } from 'zod';

import { hskLevelSchema, idSchema, isoDateTime, timestampsShape } from '../common';
import {
  currencySchema,
  jobApplicationStatusSchema,
  jobCategorySchema,
  jobStatusSchema,
  jobWorkTypeSchema,
  moderationStatusSchema,
  resumeDocumentTypeSchema,
  resumeExperienceSchema,
  type JobCategory,
  type ResumeDocumentType,
  type ResumeExperience,
} from '../enums';
import { paginationQuerySchema } from '../pagination';

/* ───────────────── Справочники для UI (ru/zh) ───────────────── */

export const JOB_CATEGORY_LABELS: Record<JobCategory, { ru: string; zh: string }> = {
  it: { ru: 'IT и разработка', zh: '信息技术' },
  trade: { ru: 'Торговля и закупки', zh: '贸易' },
  teaching: { ru: 'Преподавание', zh: '教育' },
  marketing: { ru: 'Маркетинг и PR', zh: '市场营销' },
  manufacturing: { ru: 'Производство', zh: '制造业' },
  logistics: { ru: 'Логистика', zh: '物流' },
  finance: { ru: 'Финансы', zh: '金融' },
  engineering: { ru: 'Инженерия', zh: '工程' },
  translation: { ru: 'Переводы', zh: '翻译' },
  management: { ru: 'Управление', zh: '管理' },
};

export const RESUME_EXPERIENCE_LABELS: Record<ResumeExperience, string> = {
  none: 'Нет опыта',
  lt_1: 'До 1 года',
  '1_3': '1–3 года',
  '3_6': '3–6 лет',
  gt_6: 'Более 6 лет',
};

export const JOB_WORK_TYPE_LABELS: Record<string, string> = {
  full_time: 'Полная занятость',
  part_time: 'Частичная занятость',
  remote: 'Удалённо',
  contract: 'Контракт',
  internship: 'Стажировка',
};

export const JOB_APPLICATION_STATUS_LABELS: Record<string, string> = {
  submitted: 'Отправлен',
  reviewed: 'Просмотрен',
  accepted: 'Принят',
  rejected: 'Отклонён',
};

/* ─────────────────────────── Вакансии ─────────────────────────── */

export const createJobListingSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    category: jobCategorySchema.optional(),
    description: z.string().trim().min(1).max(20000),
    salaryMin: z.number().int().min(0).optional(),
    salaryMax: z.number().int().min(0).optional(),
    currency: currencySchema.optional(),
    hskLevel: hskLevelSchema.optional(),
    workType: jobWorkTypeSchema,
    city: z.string().trim().max(120).optional(),
    expiresAt: isoDateTime.optional(),
  })
  .refine(
    j => j.salaryMin === undefined || j.salaryMax === undefined || j.salaryMax >= j.salaryMin,
    {
      error: 'Максимум зарплаты не меньше минимума',
      path: ['salaryMax'],
    }
  );
export type CreateJobListingInput = z.infer<typeof createJobListingSchema>;

/**
 * Редактирование вакансии. Базируется на полях создания без cross-field refine
 * (PATCH присылает поля частично), плюс смена статуса.
 */
export const updateJobListingSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(20000),
    salaryMin: z.number().int().min(0),
    salaryMax: z.number().int().min(0),
    currency: currencySchema,
    hskLevel: hskLevelSchema,
    workType: jobWorkTypeSchema,
    city: z.string().trim().max(120),
    expiresAt: isoDateTime,
    status: jobStatusSchema,
  })
  .partial();
export type UpdateJobListingInput = z.infer<typeof updateJobListingSchema>;

/** Листинг вакансий с фильтрами (query-string → coerce). */
export const jobListQuerySchema = paginationQuerySchema.extend({
  category: jobCategorySchema.optional(),
  workType: jobWorkTypeSchema.optional(),
  hskLevel: z.coerce.number().int().min(1).max(6).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});
export type JobListQuery = z.infer<typeof jobListQuerySchema>;

export const jobListingDtoSchema = z.object({
  id: idSchema,
  sellerId: idSchema,
  title: z.string(),
  category: jobCategorySchema.nullable(),
  description: z.string(),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  currency: currencySchema,
  hskLevel: z.number().int().nullable(),
  workType: jobWorkTypeSchema,
  city: z.string().nullable(),
  status: jobStatusSchema,
  moderationStatus: moderationStatusSchema,
  rejectionReason: z.string().nullable(),
  publishedAt: isoDateTime.nullable(),
  expiresAt: isoDateTime.nullable(),
  ...timestampsShape,
});
export type JobListingDto = z.infer<typeof jobListingDtoSchema>;

/** Публичная карточка вакансии (витрина): вакансия + данные компании. */
export const jobListingPublicDtoSchema = jobListingDtoSchema.extend({
  companyName: z.string(),
  companyPublicId: z.number().int(),
  companyVerified: z.boolean(),
  companyRating: z.string(),
});
export type JobListingPublicDto = z.infer<typeof jobListingPublicDtoSchema>;

/** Счётчик вакансий по категории (для витрины «Категории вакансий»). */
export const jobCategoryCountSchema = z.object({
  category: jobCategorySchema,
  count: z.number().int(),
});
export type JobCategoryCount = z.infer<typeof jobCategoryCountSchema>;

/* ─────────────────────────── Отклики ─────────────────────────── */

export const applyToJobSchema = z.object({
  coverLetter: z.string().trim().max(5000).optional(),
});
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;

export const updateApplicationStatusSchema = z.object({
  status: jobApplicationStatusSchema,
});
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;

export const jobApplicationDtoSchema = z.object({
  id: idSchema,
  listingId: idSchema,
  userId: idSchema,
  coverLetter: z.string().nullable(),
  status: jobApplicationStatusSchema,
  ...timestampsShape,
});
export type JobApplicationDto = z.infer<typeof jobApplicationDtoSchema>;

/** Отклик соискателя с краткими данными вакансии («Мои отклики» в кабинете). */
export const myApplicationDtoSchema = z.object({
  id: idSchema,
  listingId: idSchema,
  status: jobApplicationStatusSchema,
  coverLetter: z.string().nullable(),
  createdAt: isoDateTime,
  vacancyTitle: z.string(),
  vacancyCity: z.string().nullable(),
  companyName: z.string(),
});
export type MyApplicationDto = z.infer<typeof myApplicationDtoSchema>;

/** Отклик с краткими данными соискателя (для работодателя). */
export const applicantDtoSchema = z.object({
  id: idSchema,
  status: jobApplicationStatusSchema,
  coverLetter: z.string().nullable(),
  createdAt: isoDateTime,
  applicantPublicId: z.number().int(),
  applicantName: z.string().nullable(),
});
export type ApplicantDto = z.infer<typeof applicantDtoSchema>;

/* ─────────────────────────── Резюме ─────────────────────────── */

/** Создание/обновление резюме соискателя (upsert). После сохранения уходит на модерацию. */
export const upsertResumeSchema = z.object({
  position: z.string().trim().min(1).max(200),
  category: jobCategorySchema.optional(),
  salary: z.string().trim().max(80).optional(),
  experience: resumeExperienceSchema.optional(),
  skills: z.string().trim().max(2000).optional(),
  about: z.string().trim().max(5000).optional(),
  hskLevel: hskLevelSchema.optional(),
});
export type UpsertResumeInput = z.infer<typeof upsertResumeSchema>;

export const resumeDtoSchema = z.object({
  id: idSchema,
  userId: idSchema,
  position: z.string(),
  category: jobCategorySchema.nullable(),
  salary: z.string().nullable(),
  experience: resumeExperienceSchema.nullable(),
  skills: z.string().nullable(),
  about: z.string().nullable(),
  hskLevel: z.number().int().nullable(),
  /** Рейтинг соискателя (строкой numeric); растёт за подтверждённые документы/сертификаты. */
  rating: z.string(),
  reviewCount: z.number().int(),
  moderationStatus: moderationStatusSchema,
  rejectionReason: z.string().nullable(),
  publishedAt: isoDateTime.nullable(),
  ...timestampsShape,
});
export type ResumeDto = z.infer<typeof resumeDtoSchema>;

/* ─────────── Документы резюме (диплом/сертификат/HSK) ─────────── */

export const RESUME_DOCUMENT_TYPE_LABELS: Record<ResumeDocumentType, string> = {
  diploma: 'Диплом',
  certificate: 'Сертификат',
  hsk_certificate: 'Сертификат HSK',
  reference: 'Рекомендация',
  other: 'Другой документ',
};

/** Метаданные загрузки документа (сам файл уходит multipart-полем `file`). */
export const uploadResumeDocumentSchema = z.object({
  type: resumeDocumentTypeSchema.default('other'),
});
export type UploadResumeDocumentInput = z.infer<typeof uploadResumeDocumentSchema>;

export const resumeDocumentDtoSchema = z.object({
  id: idSchema,
  resumeId: idSchema,
  type: resumeDocumentTypeSchema,
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  /** Подтверждён модератором (учитывается в рейтинге). */
  verified: z.boolean(),
  /** Относительная ссылка на скачивание через API-прокси (с проверкой прав). */
  downloadUrl: z.string(),
  ...timestampsShape,
});
export type ResumeDocumentDto = z.infer<typeof resumeDocumentDtoSchema>;

/** Решение модератора по документу резюме: подтвердить / снять подтверждение. */
export const verifyResumeDocumentSchema = z.object({ verified: z.boolean() });
export type VerifyResumeDocumentInput = z.infer<typeof verifyResumeDocumentSchema>;

/* ─────────── Публичная база резюме (витрина для работодателей) ─────────── */

/** Фильтр публичного каталога резюме (query-string → coerce). */
export const resumeListQuerySchema = paginationQuerySchema.extend({
  category: jobCategorySchema.optional(),
  experience: resumeExperienceSchema.optional(),
  hskLevel: z.coerce.number().int().min(1).max(6).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});
export type ResumeListQuery = z.infer<typeof resumeListQuerySchema>;

/**
 * Публичная карточка резюме: только опубликованные, без приватных полей.
 * Соискатель раскрывается как публичный ID / никнейм / имя + «синяя галочка».
 */
export const resumePublicDtoSchema = z.object({
  id: idSchema,
  position: z.string(),
  category: jobCategorySchema.nullable(),
  salary: z.string().nullable(),
  experience: resumeExperienceSchema.nullable(),
  skills: z.string().nullable(),
  about: z.string().nullable(),
  hskLevel: z.number().int().nullable(),
  rating: z.string(),
  reviewCount: z.number().int(),
  publishedAt: isoDateTime.nullable(),
  candidatePublicId: z.number().int(),
  candidateName: z.string().nullable(),
  candidateNickname: z.string().nullable(),
  candidateVerified: z.boolean(),
});
export type ResumePublicDto = z.infer<typeof resumePublicDtoSchema>;

/* ───────────────── Модерация контента (резюме/вакансии) ───────────────── */

/** Решение модератора: опубликовать или отклонить (с причиной). */
export const contentModerationSchema = z
  .object({
    status: z.enum(['published', 'rejected']),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine(d => d.status !== 'rejected' || (d.reason && d.reason.length > 0), {
    error: 'Укажите причину отклонения',
    path: ['reason'],
  });
export type ContentModerationInput = z.infer<typeof contentModerationSchema>;

/** Админ-фильтр списков на модерации. */
export const moderationListQuerySchema = paginationQuerySchema.extend({
  status: moderationStatusSchema.optional(),
});
export type ModerationListQuery = z.infer<typeof moderationListQuerySchema>;
