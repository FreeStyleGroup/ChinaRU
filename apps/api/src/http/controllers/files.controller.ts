import { idSchema } from '@china-ru/shared';

import { asyncHandler } from '../async-handler';
import { NotFoundError } from '../errors';

import type { Storage } from '../../storage/storage';
import type { RequestHandler } from 'express';

export interface FilesController {
  /** Публичная раздача аватара по userId (ключ детерминированный `avatars/{userId}`). */
  avatar: RequestHandler;
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
  };
}
