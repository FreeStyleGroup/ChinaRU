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
  /** Оформление магазина — баннер/логотип (`stores/{sellerId}/{fileId}`). */
  storeImage: RequestHandler;
  /** Обложка раздела каталога (`categories/{categoryId}/{fileId}`). */
  categoryImage: RequestHandler;
}

/**
 * Файлы оформления неизменяемы: каждая загрузка получает новый fileId (адрес),
 * поэтому их можно кешировать на год — замена картинки меняет адрес.
 */
const IMMUTABLE = 'public, max-age=31536000, immutable';

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

    storeImage: asyncHandler(async (req, res) => {
      const sellerId = idSchema.parse(req.params.sellerId);
      const fileId = idSchema.parse(req.params.fileId);
      const file = await deps.storage.get(`stores/${sellerId}/${fileId}`);
      if (!file) throw new NotFoundError('Изображение не найдено', 'image_not_found');
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', IMMUTABLE);
      res.send(file.body);
    }),

    categoryImage: asyncHandler(async (req, res) => {
      const categoryId = idSchema.parse(req.params.categoryId);
      const fileId = idSchema.parse(req.params.fileId);
      const file = await deps.storage.get(`categories/${categoryId}/${fileId}`);
      if (!file) throw new NotFoundError('Изображение не найдено', 'image_not_found');
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', IMMUTABLE);
      res.send(file.body);
    }),
  };
}
