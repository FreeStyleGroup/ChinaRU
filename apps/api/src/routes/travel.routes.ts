import { Router } from 'express';
import { travelService } from '../services/travel/travel.service';
import { asyncHandler } from '../middleware/asyncHandler';

export function createTravelRoutes(): Router {
  const router = Router();

  router.get('/destinations', asyncHandler(async (req, res) => {
    const dests = await travelService.destinations();
    res.json({ success: true, data: dests });
  }));

  router.get('/packages', asyncHandler(async (req, res) => {
    const pkgs = await travelService.packages(req.query.destinationId as string);
    res.json({ success: true, data: pkgs });
  }));

  return router;
}
