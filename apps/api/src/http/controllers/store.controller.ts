import { ok, updateStoreSchema } from '@china-ru/shared';
import { z } from 'zod';

import { asyncHandler } from '../async-handler';
import { BadRequestError, UnauthorizedError } from '../errors';

import type { StoreImageKind, StoreService } from '../../domain/store/store.service';
import type { RequestHandler } from 'express';

export interface StoreController {
  /** Публичная страница магазина по никнейму, publicId или id. */
  getPublic: RequestHandler;
  /** Описание магазина (продавец). */
  update: RequestHandler;
  uploadBanner: RequestHandler;
  removeBanner: RequestHandler;
  uploadLogo: RequestHandler;
  removeLogo: RequestHandler;
}

const storeKeySchema = z.string().trim().min(1).max(64);

export function createStoreController(deps: { store: StoreService }): StoreController {
  const upload = (kind: StoreImageKind): RequestHandler =>
    asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      if (!req.file) throw new BadRequestError('Файл не передан', 'file_required');
      res.json(ok(await deps.store.setImage(req.auth.userId, kind, req.file)));
    });
  const remove = (kind: StoreImageKind): RequestHandler =>
    asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      res.json(ok(await deps.store.removeImage(req.auth.userId, kind)));
    });

  return {
    getPublic: asyncHandler(async (req, res) => {
      const key = storeKeySchema.parse(req.params.key);
      res.json(ok(await deps.store.getPublic(key)));
    }),

    update: asyncHandler(async (req, res) => {
      if (!req.auth) throw new UnauthorizedError();
      const input = updateStoreSchema.parse(req.body);
      res.json(ok(await deps.store.update(req.auth.userId, input)));
    }),

    uploadBanner: upload('banner'),
    removeBanner: remove('banner'),
    uploadLogo: upload('logo'),
    removeLogo: remove('logo'),
  };
}
