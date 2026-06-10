import { Router } from 'express';
import { z } from 'zod';
import { jobsService } from '../services/jobs/jobs.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';

const createJobSchema = z.object({
  title: z.string().min(5).max(200),
  titleCn: z.string().max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  descriptionCn: z.string().max(5000).optional(),
  salary: z.number().positive().optional(),
  currency: z.string().default('usd'),
  hskLevel: z.string().optional(),
  workType: z.string().min(3).max(100),
  expiresAt: z.string().datetime().optional(),
});

const updateJobSchema = createJobSchema.partial();

export function createJobsRoutes(): Router {
  const router = Router();

  // Get all jobs (public)
  router.get('/', asyncHandler(async (req, res) => {
    const sellerId = req.query.sellerId as string | undefined;
    const jobs = await jobsService.list(sellerId);
    res.json({ success: true, data: jobs });
  }));

  // Get job by ID (public)
  router.get('/:id', asyncHandler(async (req, res) => {
    const job = await jobsService.getById(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, data: job });
  }));

  // Create job (seller only)
  router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const data = createJobSchema.parse(req.body);
    const job = await jobsService.createBySeller(req.user!.id, {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
    res.status(201).json({ success: true, data: job });
  }));

  // Update job (seller only, ownership)
  router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
    const data = updateJobSchema.parse(req.body);
    const job = await jobsService.updateBySeller(req.params.id, req.user!.id, {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found or access denied' });
    res.json({ success: true, data: job });
  }));

  // Delete job (seller only, ownership)
  router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
    const deleted = await jobsService.deleteBySeller(req.params.id, req.user!.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Job not found or access denied' });
    res.json({ success: true });
  }));

  return router;
}
