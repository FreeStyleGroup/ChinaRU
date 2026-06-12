import { z } from 'zod';

import { idSchema, slugSchema, timestampsShape } from '../common';

/**
 * Метро — справочные данные (read-mostly, наполняются seed-ом). Схемы создания
 * используются админкой и сидером; DTO — публичной выдачей.
 */

export const createMetroCitySchema = z.object({
  slug: slugSchema,
  nameRu: z.string().trim().min(1).max(120),
  nameZh: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  sort: z.number().int().min(0).optional(),
});
export type CreateMetroCityInput = z.infer<typeof createMetroCitySchema>;

export const createMetroLineSchema = z.object({
  cityId: idSchema,
  nameRu: z.string().trim().min(1).max(120),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: 'Цвет в формате #RRGGBB' })
    .optional(),
  lineNumber: z.string().trim().max(16).optional(),
  sort: z.number().int().min(0).optional(),
});
export type CreateMetroLineInput = z.infer<typeof createMetroLineSchema>;

export const createMetroStationSchema = z.object({
  lineId: idSchema,
  nameRu: z.string().trim().min(1).max(160),
  nameZh: z.string().trim().max(160).optional(),
  geoLat: z.number().min(-90).max(90).optional(),
  geoLon: z.number().min(-180).max(180).optional(),
  sort: z.number().int().min(0).optional(),
});
export type CreateMetroStationInput = z.infer<typeof createMetroStationSchema>;

export const metroStationDtoSchema = z.object({
  id: idSchema,
  lineId: idSchema,
  nameRu: z.string(),
  nameZh: z.string().nullable(),
  geoLat: z.string().nullable(),
  geoLon: z.string().nullable(),
  sort: z.number().int(),
});
export type MetroStationDto = z.infer<typeof metroStationDtoSchema>;

export const metroLineDtoSchema = z.object({
  id: idSchema,
  cityId: idSchema,
  nameRu: z.string(),
  color: z.string().nullable(),
  lineNumber: z.string().nullable(),
  sort: z.number().int(),
  stations: z.array(metroStationDtoSchema),
});
export type MetroLineDto = z.infer<typeof metroLineDtoSchema>;

export const metroCityDtoSchema = z.object({
  id: idSchema,
  slug: z.string(),
  nameRu: z.string(),
  nameZh: z.string().nullable(),
  country: z.string().nullable(),
  sort: z.number().int(),
  ...timestampsShape,
});
export type MetroCityDto = z.infer<typeof metroCityDtoSchema>;
