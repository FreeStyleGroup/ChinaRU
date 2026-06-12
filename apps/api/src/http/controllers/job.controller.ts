import { createJobListingSchema, jobListQuerySchema, ok, upsertResumeSchema } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { JobService } from '../../domain/jobs/job.service';
import type { RequestHandler } from 'express';

export interface JobController {
  getResume: RequestHandler;
  upsertResume: RequestHandler;
  listVacancies: RequestHandler;
  createVacancy: RequestHandler;
  myVacancies: RequestHandler;
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

    createVacancy: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = createJobListingSchema.parse(req.body);
      res.json(ok(await deps.jobs.createVacancy(req.auth.userId, input)));
    }),

    myVacancies: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.jobs.myVacancies(req.auth.userId)));
    }),
  };
}
