import {
  applyToJobSchema,
  createJobListingSchema,
  idSchema,
  jobListQuerySchema,
  ok,
  updateApplicationStatusSchema,
  upsertResumeSchema,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { JobService } from '../../domain/jobs/job.service';
import type { RequestHandler } from 'express';

export interface JobController {
  getResume: RequestHandler;
  upsertResume: RequestHandler;
  listVacancies: RequestHandler;
  getVacancy: RequestHandler;
  categoryCounts: RequestHandler;
  createVacancy: RequestHandler;
  myVacancies: RequestHandler;
  apply: RequestHandler;
  myApplications: RequestHandler;
  listingApplicants: RequestHandler;
  setApplicationStatus: RequestHandler;
}

export function createJobController(deps: { jobs: JobService }): JobController {
  return {
    getResume: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.jobs.getOwnResume(req.auth.userId)));
    }),

    upsertResume: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = upsertResumeSchema.parse(req.body);
      res.json(ok(await deps.jobs.upsertResume(req.auth.userId, input)));
    }),

    listVacancies: asyncHandler(async (req, res) => {
      const query = jobListQuerySchema.parse(req.query);
      res.json(ok(await deps.jobs.listPublishedVacancies(query)));
    }),

    getVacancy: asyncHandler(async (req, res) => {
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.jobs.getPublicVacancy(id)));
    }),

    categoryCounts: asyncHandler(async (_req, res) => {
      res.json(ok(await deps.jobs.categoryCounts()));
    }),

    createVacancy: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = createJobListingSchema.parse(req.body);
      res.json(ok(await deps.jobs.createVacancy(req.auth.userId, input)));
    }),

    myVacancies: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.jobs.myVacancies(req.auth.userId)));
    }),

    apply: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = applyToJobSchema.parse(req.body);
      res.status(201).json(ok(await deps.jobs.apply(req.auth.userId, id, input)));
    }),

    myApplications: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.jobs.myApplications(req.auth.userId)));
    }),

    listingApplicants: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.jobs.listingApplicants(req.auth.userId, id)));
    }),

    setApplicationStatus: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      const input = updateApplicationStatusSchema.parse(req.body);
      res.json(ok(await deps.jobs.setApplicationStatus(req.auth.userId, id, input)));
    }),
  };
}
