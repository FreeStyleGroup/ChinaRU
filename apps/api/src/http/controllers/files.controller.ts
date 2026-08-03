import { idSchema } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { NotFoundError } from '../errors';

import type { Storage } from '../../storage/storage';
import type { RequestHandler } from 'express';

export interface FilesController {
  /** Публичная раздача аватара по userId (ключ детерминированный `avatars/{userId}`). */
  avatar: RequestHandler;
  /** Публичная раздача изображения товара (`product-images/{productId}/{imageId}`). */
  productImage: RequestHandler;
}

export function createFilesController(deps: { storage: Storage }): FilesController {
  return {
    avatar: asyncHandler(async (req, res) => {
      const userId = idSchema.parse(req.params.userId);
      const file = await deps.storage.get(`avatars/${userId}`);
      if (!file) throw new NotFoundError('Аватар не найден', 'avatar_not_found');
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(file.body);
    }),

    productImage: asyncHandler(async (req, res) => {
      const productId = idSchema.parse(req.params.productId);
      const imageId = idSchema.parse(req.params.imageId);
      const file = await deps.storage.get(`product-images/${productId}/${imageId}`);
      if (!file) throw new NotFoundError('Изображение не найдено', 'image_not_found');
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(file.body);
    }),
  };
}
