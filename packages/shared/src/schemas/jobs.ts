import { z } from 'zod';

import { hskLevelSchema, idSchema, isoDateTime, timestampsShape } from '../common';
import {
  currencySchema,
  jobApplicationStatusSchema,
  jobStatusSchema,
  jobWorkTypeSchema,
} from '../enums';
import { paginationQuerySchema } from '../pagination';

/* ─────────────────────────── Вакансии ─────────────────────────── */

export const createJobListingSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
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
  description: z.string(),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  currency: currencySchema,
  hskLevel: z.number().int().nullable(),
  workType: jobWorkTypeSchema,
  city: z.string().nullable(),
  status: jobStatusSchema,
  expiresAt: isoDateTime.nullable(),
  ...timestampsShape,
});
export type JobListingDto = z.infer<typeof jobListingDtoSchema>;

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
