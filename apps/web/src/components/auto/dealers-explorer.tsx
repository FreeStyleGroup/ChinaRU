'use client';

import { useState } from 'react';

import { vehicleClient } from '@/lib/api-client';

import { YandexMap } from './yandex-map';

import type { DealerDto, VehicleBrandDto } from '@china-ru/shared';

export function DealersExplorer({
  cities,
  brands,
  initialCity,
  initialDealers,
}: {
  cities: string[];
  brands: VehicleBrandDto[];
  initialCity: string;
  initialDealers: DealerDto[];
}) {
  const [city, setCity] = useState(initialCity);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dealers, setDealers] = useState<DealerDto[]>(initialDealers);
  const [loading, setLoading] = useState(false);

  const reload = async (nextCity: string, brandIds: Set<string>): Promise<void> => {
    setLoading(true);
    try {
      const res = await vehicleClient.dealers({
        ...(nextCity ? { city: nextCity } : {}),
        ...(brandIds.size > 0 ? { brands: [...brandIds] } : {}),
      });
      setDealers(res);
    } catch {
      // оставляем что есть
    } finally {
      setLoading(false);
    }
  };

  const onCity = (next: string): void => {
    setCity(next);
    void reload(next, selected);
  };

  const toggleBrand = (id: string): void => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    void reload(city, next);
  };

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3 rounded-2xl border border-line bg-white p-4">
          <select
            value={city}
            onChange={e => {
              onCity(e.target.value);
            }}
            className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
          >
            {cities.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
            {brands.map(b => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface"
              >
                <input
                  type="checkbox"
                  checked={selected.has(b.id)}
                  onChange={() => {
                    toggleBrand(b.id);
                  }}
                  className="accent-brand"
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>

        <YandexMap dealers={dealers} />
      </div>

      <div className="mt-4">
        <p className="mb-3 text-sm text-muted">
          {loading ? 'Загрузка…' : `Найдено дилеров: ${dealers.length}`}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {dealers.map(d => (
            <div key={d.id} className="rounded-2xl border border-line bg-white p-4">
              <p className="font-semibold text-ink">{d.name}</p>
              <p className="mt-1 text-sm text-muted">
                {d.city}, {d.address}
              </p>
              {d.phone && <p className="mt-1 text-sm text-ink">{d.phone}</p>}
              {d.brands.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.brands.map(b => (
                    <span key={b.id} className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                      {b.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
