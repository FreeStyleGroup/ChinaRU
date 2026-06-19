import { Container } from '@china-ru/ui';

import { DealersExplorer } from '@/components/auto/dealers-explorer';
import { Link } from '@/i18n/navigation';
import { autoApi } from '@/lib/api';

import type { DealerDto, VehicleBrandDto } from '@china-ru/shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Официальные дилеры китайских авто в России — карта | China.ru',
  description:
    'Официальные дилеры китайских автомобильных марок в России на карте. Фильтр по городу и бренду — Haval, Chery, Geely, Changan, BYD и другие.',
};

export default async function DealersPage() {
  const [cities, brands] = await Promise.all([
    autoApi.dealerCities().catch(() => [] as string[]),
    autoApi.brands().catch(() => [] as VehicleBrandDto[]),
  ]);
  const initialCity = cities.includes('Москва') ? 'Москва' : (cities[0] ?? '');
  const initialDealers = await autoApi
    .dealers(initialCity || undefined)
    .catch(() => [] as DealerDto[]);

  return (
    <Container className="py-8">
      <Link href="/auto" className="text-sm text-muted hover:text-brand">
        ← Авто-раздел
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
        Официальные дилеры в России
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Выберите город и марки — на карте появятся официальные дилеры китайских автопроизводителей.
      </p>

      <div className="mt-6">
        {cities.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-muted">
            Справочник дилеров пока пуст.
          </p>
        ) : (
          <DealersExplorer
            cities={cities}
            brands={brands}
            initialCity={initialCity}
            initialDealers={initialDealers}
          />
        )}
      </div>
    </Container>
  );
}
