import { z } from 'zod';

/**
 * Разделы личного кабинета China.ru. `pinned` — всегда в меню; остальные
 * пользователь включает/выключает («Настройка меню»). Источник правды для
 * навигации кабинета и валидации пользовательских настроек меню.
 */
export interface CabinetSection {
  key: string;
  titleRu: string;
  pinned: boolean;
}

export const CABINET_SECTIONS = [
  { key: 'profile', titleRu: 'Профиль', pinned: true },
  { key: 'orders', titleRu: 'Мои заказы', pinned: true },
  { key: 'social', titleRu: 'Социальная сеть', pinned: true },
  { key: 'wallet', titleRu: 'Кошелёк', pinned: true },
  { key: 'partners', titleRu: 'Мои партнёры', pinned: true },
  { key: 'store', titleRu: 'Мой магазин', pinned: true },
  { key: 'travel', titleRu: 'Путешествия', pinned: true },
  { key: 'garage', titleRu: 'Мой гараж', pinned: true },
  { key: 'concierge', titleRu: 'Консьерж', pinned: false },
  { key: 'events', titleRu: 'Афиша', pinned: false },
  { key: 'tenders', titleRu: 'Тендеры', pinned: false },
  { key: 'freight', titleRu: 'Грузоперевозки', pinned: false },
  { key: 'jobs', titleRu: 'Работа', pinned: false },
  { key: 'education', titleRu: 'Обучение', pinned: false },
  { key: 'horoscope', titleRu: 'Гороскоп', pinned: false },
  { key: 'promos', titleRu: 'Акции', pinned: false },
] as const satisfies readonly CabinetSection[];

export type CabinetSectionKey = (typeof CABINET_SECTIONS)[number]['key'];

/** Ключи опциональных (переключаемых) разделов. */
export const OPTIONAL_SECTION_KEYS = CABINET_SECTIONS.filter(s => !s.pinned).map(s => s.key);

export function isOptionalSectionKey(value: string): boolean {
  return (OPTIONAL_SECTION_KEYS as readonly string[]).includes(value);
}

/** Обновление набора включённых опциональных разделов. */
export const updateMenuSectionsSchema = z.object({
  sections: z
    .array(z.string())
    .max(32)
    .transform(keys => keys.filter(isOptionalSectionKey)),
});
export type UpdateMenuSectionsInput = z.infer<typeof updateMenuSectionsSchema>;
