import { z } from 'zod';

import { idSchema, isoDateTime } from '../common';
import { devicePlatformSchema } from '../enums';

/** Регистрация push-токена мобильного устройства (FCM/APNs). */
export const registerDeviceSchema = z.object({
  platform: devicePlatformSchema,
  token: z.string().trim().min(1).max(512),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const deviceDtoSchema = z.object({
  id: idSchema,
  userId: idSchema,
  platform: devicePlatformSchema,
  token: z.string(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type DeviceDto = z.infer<typeof deviceDtoSchema>;
