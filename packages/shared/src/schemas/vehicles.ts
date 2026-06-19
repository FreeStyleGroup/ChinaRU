import { z } from 'zod';

import { idSchema, isoDateTime } from '../common';
import { vehicleTypeSchema, type VehicleType } from '../enums';

/**
 * Авто-раздел: бренды китайского автопарка, их модели, официальные дилеры в России
 * (с координатами для карты) и «Мой гараж» пользователя. По выбранному в гараже
 * транспорту в кабинете подбираются запчасти (через таблицу применимости fitment).
 */

/* ───────────────── Бренды ───────────────── */

export const vehicleBrandDtoSchema = z.object({
  id: idSchema,
  slug: z.string(),
  name: z.string(),
  nameZh: z.string().nullable(),
  country: z.string(),
  /** Направления, которые покрывает бренд (auto/moto/special). */
  types: z.array(vehicleTypeSchema),
  logoUrl: z.string().nullable(),
  popular: z.boolean(),
  modelCount: z.number().int(),
});
export type VehicleBrandDto = z.infer<typeof vehicleBrandDtoSchema>;

export const vehicleBrandListQuerySchema = z.object({
  type: vehicleTypeSchema.optional(),
  popular: z.coerce.boolean().optional(),
});
export type VehicleBrandListQuery = z.infer<typeof vehicleBrandListQuerySchema>;

/* ───────────────── Модели ───────────────── */

export const vehicleModelDtoSchema = z.object({
  id: idSchema,
  brandId: idSchema,
  slug: z.string(),
  name: z.string(),
  type: vehicleTypeSchema,
  bodyType: z.string().nullable(),
  yearFrom: z.number().int().nullable(),
  yearTo: z.number().int().nullable(),
  imageUrl: z.string().nullable(),
});
export type VehicleModelDto = z.infer<typeof vehicleModelDtoSchema>;

/* ───────────────── Дилеры ───────────────── */

export const dealerBrandRefSchema = z.object({
  id: idSchema,
  slug: z.string(),
  name: z.string(),
});
export type DealerBrandRef = z.infer<typeof dealerBrandRefSchema>;

export const dealerDtoSchema = z.object({
  id: idSchema,
  name: z.string(),
  city: z.string(),
  region: z.string().nullable(),
  address: z.string(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  brands: z.array(dealerBrandRefSchema),
});
export type DealerDto = z.infer<typeof dealerDtoSchema>;

/** Фильтр дилеров: город + бренды (csv id) — как на карте «Официальные дилеры». */
export const dealerListQuerySchema = z.object({
  city: z.string().trim().max(120).optional(),
  brands: z.string().trim().max(2000).optional(),
});
export type DealerListQuery = z.infer<typeof dealerListQuerySchema>;

/* ───────────────── Мой гараж ───────────────── */

export const addGarageVehicleSchema = z
  .object({
    brandId: idSchema,
    modelId: idSchema.optional(),
    /** Название модели (если её нет в справочнике — свободный ввод). */
    modelName: z.string().trim().min(1).max(120).optional(),
    year: z.number().int().min(1980).max(2100).optional(),
    vin: z.string().trim().max(32).optional(),
    plate: z.string().trim().max(16).optional(),
    type: vehicleTypeSchema.default('auto'),
  })
  .refine(v => v.modelId !== undefined || v.modelName !== undefined, {
    error: 'Укажите модель',
    path: ['modelName'],
  });
export type AddGarageVehicleInput = z.infer<typeof addGarageVehicleSchema>;

export const garageVehicleDtoSchema = z.object({
  id: idSchema,
  brandId: idSchema,
  brandName: z.string(),
  modelId: idSchema.nullable(),
  modelName: z.string(),
  year: z.number().int().nullable(),
  vin: z.string().nullable(),
  plate: z.string().nullable(),
  type: vehicleTypeSchema,
  createdAt: isoDateTime,
});
export type GarageVehicleDto = z.infer<typeof garageVehicleDtoSchema>;

/* ───────────────── Лейблы (UI) ───────────────── */

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  auto: 'Автомобили',
  moto: 'Мототехника',
  special: 'Спецтехника',
};
