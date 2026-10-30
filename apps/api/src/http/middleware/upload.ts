import multer, { MulterError } from 'multer';

import { BadRequestError } from '../errors';

import type { RequestHandler } from 'express';

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const DOCUMENT_MIMES = ['application/pdf', ...IMAGE_MIMES] as const;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 МБ
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 МБ
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 МБ

/** Оформление магазина: без GIF — баннер и логотип статичны. */
export const STORE_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const STORE_BANNER_MAX_BYTES = 5 * 1024 * 1024; // 5 МБ
export const STORE_LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 МБ

export interface UploadLimits {
  maxBytes: number;
  mimes: readonly string[];
}

/** Узкий контракт загруженного файла (структурно совместим с `Express.Multer.File`). */
export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Приём одного файла (multipart-поле `field`) в память с лимитом размера и
 * проверкой MIME. Ошибки multer (превышение размера и т.п.) переводятся в наши
 * доменные ошибки → единый конверт ответа, без 500. Файл доступен как `req.file`.
 */
export function singleUpload(field: string, limits: UploadLimits): RequestHandler {
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limits.maxBytes, files: 1 },
  }).single(field);

  return (req, res, next) => {
    handler(req, res, (uploadErr: unknown) => {
      if (uploadErr) {
        if (uploadErr instanceof MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
          const mb = Math.round(limits.maxBytes / (1024 * 1024));
          next(new BadRequestError(`Файл больше ${mb} МБ`, 'file_too_large'));
          return;
        }
        next(new BadRequestError('Не удалось загрузить файл', 'upload_failed'));
        return;
      }
      const file = req.file;
      if (!file) {
        next(new BadRequestError('Файл не передан', 'file_required'));
        return;
      }
      if (!limits.mimes.includes(file.mimetype)) {
        next(new BadRequestError('Недопустимый тип файла', 'unsupported_type'));
        return;
      }
      next();
    });
  };
}
