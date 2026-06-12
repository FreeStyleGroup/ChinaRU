'use client';

/**
 * Путешествия — вкладки по типам бронирований. Пустые состояния + CTA в публичный
 * раздел /travel/. Реальные брони подключаются при сборке раздела путешествий.
 */
import { EmptyState, Tabs } from '@/components/cabinet/tabs';

const TABS = [
  { key: 'flights', label: 'Авиабилеты' },
  { key: 'hotels', label: 'Отели' },
  { key: 'tours', label: 'Туры' },
  { key: 'business', label: 'Бизнес тур' },
  { key: 'cars', label: 'Авто' },
  { key: 'insurance', label: 'Страховки' },
  { key: 'archive', label: 'Архив' },
] as const;

const EMPTY: Record<string, { title: string; cta: string }> = {
  flights: { title: 'Нет активных бронирований авиабилетов.', cta: 'Найти билеты' },
  hotels: { title: 'Нет активных броней отелей.', cta: 'Найти отель' },
  tours: { title: 'Нет активных туров.', cta: 'Подобрать тур' },
  business: { title: 'Нет активных бизнес-туров.', cta: 'Организовать бизнес-тур' },
  cars: { title: 'Нет активной аренды авто.', cta: 'Арендовать авто' },
  insurance: { title: 'Нет оформленных страховок.', cta: 'Оформить страховку' },
  archive: { title: 'Архив поездок пуст.', cta: 'Смотреть путешествия' },
};

export default function TravelPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Путешествия</h1>

      <Tabs tabs={TABS}>
        {active => {
          const e = EMPTY[active] ?? EMPTY.flights;
          return <EmptyState title={e?.title ?? ''} action={{ label: e?.cta ?? '', href: '/travel' }} />;
        }}
      </Tabs>

      <p className="text-center text-xs text-muted">
        Демонстрационный раздел — бронирования подключаются вместе с разделом «Путешествия».
      </p>
    </div>
  );
}
