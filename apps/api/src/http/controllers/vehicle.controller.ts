import {
  dealerListQuerySchema,
  idSchema,
  ok,
  vehicleBrandListQuerySchema,
  vehicleTypeSchema,
} from '@china-ru/shared';

import { asyncHandler } from '../async-handler';

import type { DealerService, VehicleService } from '../../domain/vehicles/vehicle.service';
import type { RequestHandler } from 'express';

export interface VehicleController {
  listBrands: RequestHandler;
  listModels: RequestHandler;
  listDealers: RequestHandler;
  dealerCities: RequestHandler;
}

export function createVehicleController(deps: {
  vehicles: VehicleService;
  dealers: DealerService;
}): VehicleController {
  return {
    listBrands: asyncHandler(async (req, res) => {
      const query = vehicleBrandListQuerySchema.parse(req.query);
      res.json(ok(await deps.vehicles.listBrands(query)));
    }),

    listModels: asyncHandler(async (req, res) => {
      const brandId = idSchema.parse(req.params.brandId);
      const type = vehicleTypeSchema.optional().parse(req.query.type);
      res.json(ok(await deps.vehicles.listModels(brandId, type)));
    }),

    listDealers: asyncHandler(async (req, res) => {
      const query = dealerListQuerySchema.parse(req.query);
      res.json(ok(await deps.dealers.list(query)));
    }),

    dealerCities: asyncHandler(async (_req, res) => {
      res.json(ok(await deps.dealers.cities()));
    }),
  };
}
