'use client';

/**
 * Избранное — вкладки Товары / Списки желаний / Любимые магазины.
 * Демо-данные; подписки/списки подключаются при сборке каталога и брендов.
 */
import { EmptyState, Tabs } from '@/components/cabinet/tabs';

interface FavShop {
  id: number;
  name: string;
  rating: string;
  desc: string;
}

const FAV_SHOPS: FavShop[] = [
  {
    id: 5,
    name: 'Xiaomi Official Store',
    rating: '4.9',
    desc: 'Официальный магазин экосистемы Xiaomi: смартфоны, умный дом, аксессуары.',
  },
  {
    id: 12,
    name: 'Baseus Flagship',
    rating: '4.8',
    desc: 'Зарядные устройства, кабели, автоаксессуары и аудио Baseus.',
  },
  {
    id: 28,
    name: 'Dreame Home',
    rating: '4.7',
    desc: 'Роботы-пылесосы, вертикальные пылесосы и техника для дома Dreame.',
  },
];

const TABS = [
  { key: 'products', label: 'Товары', count: 0 },
  { key: 'wishlists', label: 'Списки желаний', count: 0 },
  { key: 'shops', label: 'Любимые магазины', count: FAV_SHOPS.length },
] as const;

export default function FavoritesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Избранное</h1>

      <Tabs tabs={TABS}>
        {active => {
          if (active === 'products') {
            return (
              <EmptyState
                title="В избранном пока нет товаров."
                action={{ label: 'Перейти в каталог', href: '/catalog' }}
              />
            );
          }
          if (active === 'wishlists') {
            return <EmptyState title="У вас пока нет списков желаний." />;
          }
          return (
            <div className="grid gap-4 sm:grid-cols-2">
              {FAV_SHOPS.map(shop => (
                <div
                  key={shop.id}
                  className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5"
                >
                  <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-surface text-lg font-bold text-brand">
                    {shop.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{shop.name}</p>
                    <p className="mt-0.5 text-sm font-medium text-amber-500">★ {shop.rating}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{shop.desc}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <a
                        href={`/brands/${shop.id}`}
                        className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Перейти
                      </a>
                      <button type="button" className="text-xs text-muted hover:text-brand">
                        Отписаться
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }}
      </Tabs>

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — списки и подписки подключаются позже.
      </p>
    </div>
  );
}
