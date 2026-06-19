import { addGarageVehicleSchema, idSchema, ok } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { UnauthorizedError } from '../errors';

import type { GarageService } from '../../domain/vehicles/garage.service';
import type { RequestHandler } from 'express';

export interface GarageController {
  list: RequestHandler;
  add: RequestHandler;
  remove: RequestHandler;
  parts: RequestHandler;
}

export function createGarageController(deps: { garage: GarageService }): GarageController {
  return {
    list: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.garage.list(req.auth.userId)));
    }),

    add: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = addGarageVehicleSchema.parse(req.body);
      res.status(201).json(ok(await deps.garage.add(req.auth.userId, input)));
    }),

    remove: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      await deps.garage.remove(req.auth.userId, id);
      res.json(ok({ id }));
    }),

    parts: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = idSchema.parse(req.params.id);
      res.json(ok(await deps.garage.partsForVehicle(req.auth.userId, id)));
    }),
  };
}
