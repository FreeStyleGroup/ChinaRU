import { z } from 'zod';

/**
 * Дневной прогноз гороскопа для личного кабинета. Знак определяется по дате рождения
 * пользователя, текст прогноза генерируется ИИ-провайдером (или детерминированный
 * stub, если ИИ не настроен).
 */
export const horoscopeForecastDtoSchema = z.object({
  sign: z.object({
    key: z.string(),
    ru: z.string(),
    cn: z.string(),
    emoji: z.string(),
    element: z.string(),
  }),
  /** Дата прогноза YYYY-MM-DD. */
  date: z.string(),
  facets: z.object({
    love: z.string(),
    career: z.string(),
    finance: z.string(),
    health: z.string(),
  }),
  /** true — текст сгенерирован ИИ; false — детерминированный демо-прогноз. */
  generated: z.boolean(),
});
export type HoroscopeForecastDto = z.infer<typeof horoscopeForecastDtoSchema>;
