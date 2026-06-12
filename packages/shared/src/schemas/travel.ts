import { z } from 'zod';

import { idSchema, isoDate, moneyString, slugSchema, timestampsShape } from '../common';
import { bookingStatusSchema, currencySchema } from '../enums';

/* ─────────────────────────── Направления ─────────────────────────── */

export const createDestinationSchema = z.object({
  slug: slugSchema,
  nameRu: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).optional(),
  nameZh: z.string().trim().max(200).optional(),
  description: z.string().trim().max(20000).optional(),
  heroImage: z.url().max(2048).optional(),
});
export type CreateDestinationInput = z.infer<typeof createDestinationSchema>;

export const updateDestinationSchema = createDestinationSchema.partial();
export type UpdateDestinationInput = z.infer<typeof updateDestinationSchema>;

export const destinationDtoSchema = z.object({
  id: idSchema,
  slug: z.string(),
  nameRu: z.string(),
  nameEn: z.string().nullable(),
  nameZh: z.string().nullable(),
  description: z.string().nullable(),
  heroImage: z.string().nullable(),
  ...timestampsShape,
});
export type DestinationDto = z.infer<typeof destinationDtoSchema>;

/* ─────────────────────────── Турпакеты ─────────────────────────── */

export const createPackageSchema = z.object({
  destinationId: idSchema,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(20000).optional(),
  price: moneyString,
  currency: currencySchema.optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
  isPublished: z.boolean().optional(),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = createPackageSchema.partial().omit({ destinationId: true });
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const packageDtoSchema = z.object({
  id: idSchema,
  destinationId: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  price: z.string(),
  currency: currencySchema,
  durationDays: z.number().int().nullable(),
  isPublished: z.boolean(),
  ...timestampsShape,
});
export type PackageDto = z.infer<typeof packageDtoSchema>;

/* ─────────────────────────── Бронирования ─────────────────────────── */

export const createBookingSchema = z
  .object({
    packageId: idSchema,
    startDate: isoDate,
    endDate: isoDate,
    passengers: z.number().int().min(1).max(50),
  })
  .refine(b => b.endDate >= b.startDate, {
    error: 'Дата окончания не раньше даты начала',
    path: ['endDate'],
  });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const bookingDtoSchema = z.object({
  id: idSchema,
  userId: idSchema,
  packageId: idSchema,
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  passengers: z.number().int(),
  status: bookingStatusSchema,
  totalAmount: z.string(),
  currency: currencySchema,
  ...timestampsShape,
});
export type BookingDto = z.infer<typeof bookingDtoSchema>;
