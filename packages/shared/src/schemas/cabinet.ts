import { z } from 'zod';

/**
 * Разделы личного кабинета China.ru. Структура повторяет боевой Битрикс
 * (china:cabinet): пункты сгруппированы (`group`) с разделителями, у некоторых
 * есть вложенные подпункты (`subitems`). `pinned` — всегда в меню; остальные
 * пользователь включает/выключает («Настройка меню»). Источник правды для
 * навигации кабинета и валидации пользовательских настроек меню.
 */
export type CabinetGroup = 'main' | 'shop' | 'services';

export interface CabinetSubItem {
  key: string;
  titleRu: string;
}

export interface CabinetSection {
  key: string;
  titleRu: string;
  group: CabinetGroup;
  pinned: boolean;
  subitems?: readonly CabinetSubItem[];
}

export const CABINET_SECTIONS = [
  {
    key: 'profile',
    titleRu: 'Профиль',
    group: 'main',
    pinned: true,
    subitems: [
      { key: 'payment-methods', titleRu: 'Карты оплаты' },
      { key: 'addresses', titleRu: 'Адрес доставки' },
    ],
  },
  {
    key: 'orders',
    titleRu: 'Мои заказы',
    group: 'main',
    pinned: true,
    subitems: [
      { key: 'favorites', titleRu: 'Избранное' },
      { key: 'reviews', titleRu: 'Мои отзывы' },
      { key: 'questions', titleRu: 'Вопрос / Ответ' },
      { key: 'coupons', titleRu: 'Баллы и Купоны' },
    ],
  },
  { key: 'social', titleRu: 'Социальная сеть', group: 'main', pinned: true },
  { key: 'wallet', titleRu: 'Кошелёк', group: 'main', pinned: true },
  { key: 'partners', titleRu: 'Мои партнёры', group: 'main', pinned: true },
  { key: 'store', titleRu: 'Мой магазин', group: 'shop', pinned: true },
  { key: 'travel', titleRu: 'Путешествия', group: 'services', pinned: true },
  { key: 'garage', titleRu: 'Мой гараж', group: 'services', pinned: true },
  { key: 'concierge', titleRu: 'Консьерж', group: 'main', pinned: false },
  { key: 'events', titleRu: 'Афиша', group: 'main', pinned: false },
  { key: 'tenders', titleRu: 'Тендеры', group: 'services', pinned: false },
  { key: 'freight', titleRu: 'Грузоперевозки', group: 'services', pinned: false },
  { key: 'jobs', titleRu: 'Работа', group: 'services', pinned: false },
  { key: 'education', titleRu: 'Обучение', group: 'services', pinned: false },
  { key: 'horoscope', titleRu: 'Гороскоп', group: 'services', pinned: false },
  { key: 'promos', titleRu: 'Акции', group: 'services', pinned: false },
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
