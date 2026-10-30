'use client';

/**
 * Мой гараж: транспорт пользователя из справочника авто-раздела. По выбранному ТС
 * в каталоге подбираются применимые запчасти (через таблицу fitment). Живые данные.
 */
import { Button } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { ClientApiError, garageClient, vehicleClient } from '@/lib/api-client';

import type {
  GarageVehicleDto,
  ProductDto,
  VehicleBrandDto,
  VehicleModelDto,
} from '@china-ru/shared';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1999 }, (_, i) => CURRENT_YEAR - i);

/** Базовые позиции ТО — быстрый поиск в каталоге, если применимых товаров ещё нет. */
const TO_PARTS = [
  'Моторное масло',
  'Масляный фильтр',
  'Воздушный фильтр',
  'Салонный фильтр',
  'Свечи зажигания',
  'Тормозные колодки',
];

export default function GaragePage() {
  const tp = useTranslations('product');
  const [cars, setCars] = useState<GarageVehicleDto[]>([]);
  const [brands, setBrands] = useState<VehicleBrandDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [parts, setParts] = useState<ProductDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  // форма добавления
  const [adding, setAdding] = useState(false);
  const [brandId, setBrandId] = useState('');
  const [models, setModels] = useState<VehicleModelDto[]>([]);
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      garageClient.list().catch(() => [] as GarageVehicleDto[]),
      vehicleClient.brands().catch(() => [] as VehicleBrandDto[]),
    ]).then(([list, b]) => {
      if (cancelled) return;
      setCars(list);
      setBrands(b);
      setActiveId(list[0]?.id ?? null);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      setParts([]);
      return;
    }
    let cancelled = false;
    void garageClient
      .parts(activeId)
      .then(p => !cancelled && setParts(p))
      .catch(() => !cancelled && setParts([]));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const onBrand = (id: string): void => {
    setBrandId(id);
    setModelId('');
    setModelName('');
    setModels([]);
    if (id) {
      void vehicleClient
        .models(id)
        .then(setModels)
        .catch(() => setModels([]));
    }
  };

  const add = async (): Promise<void> => {
    if (!brandId) return;
    const chosen = models.find(m => m.id === modelId);
    const name = chosen?.name ?? modelName.trim();
    if (!name) {
      setError('Укажите модель');
      return;
    }
    setError('');
    try {
      const created = await garageClient.add({
        brandId,
        ...(modelId ? { modelId } : {}),
        ...(name ? { modelName: name } : {}),
        year,
        type: 'auto',
      });
      setCars(prev => [created, ...prev]);
      setActiveId(created.id);
      setAdding(false);
      setBrandId('');
      setModelId('');
      setModelName('');
      setModels([]);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : 'Не удалось добавить транспорт');
    }
  };

  const remove = async (id: string): Promise<void> => {
    await garageClient.remove(id).catch(() => undefined);
    setCars(prev => {
      const next = prev.filter(c => c.id !== id);
      setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const active = cars.find(c => c.id === activeId) ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Мой гараж</h1>

      <div className="flex flex-wrap items-center gap-2">
        {cars.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setActiveId(c.id);
            }}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              c.id === activeId
                ? 'border-brand bg-brand/10 font-medium text-brand'
                : 'border-line text-muted hover:bg-surface'
            }`}
          >
            {c.brandName} {c.modelName}
            <span
              role="button"
              tabIndex={0}
              onClick={e => {
                e.stopPropagation();
                void remove(c.id);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  void remove(c.id);
                }
              }}
              className="text-muted hover:text-brand"
            >
              ×
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setAdding(v => !v);
          }}
          className="rounded-full border border-dashed border-line px-4 py-1.5 text-sm text-ink hover:bg-surface"
        >
          + Добавить транспорт
        </button>
      </div>

      {adding && (
        <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <select
              value={brandId}
              onChange={e => {
                onBrand(e.target.value);
              }}
              className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand"
            >
              <option value="">Марка</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {models.length > 0 ? (
              <select
                value={modelId}
                onChange={e => {
                  setModelId(e.target.value);
                }}
                disabled={!brandId}
                className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand disabled:bg-surface"
              >
                <option value="">Модель</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={modelName}
                onChange={e => {
                  setModelName(e.target.value);
                }}
                disabled={!brandId}
                placeholder="Модель"
                className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand disabled:bg-surface"
              />
            )}
            <select
              value={year}
              onChange={e => {
                setYear(Number(e.target.value));
              }}
              className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand"
            >
              {YEARS.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Button
              disabled={!brandId || (models.length > 0 ? !modelId : modelName.trim().length === 0)}
              onClick={() => {
                void add();
              }}
            >
              Сохранить
            </Button>
          </div>
        </div>
      )}

      {!loaded ? (
        <p className="text-sm text-muted">Загрузка…</p>
      ) : active ? (
        <>
          <div className="flex items-center gap-5 rounded-2xl bg-ink p-6 text-white">
            <span className="text-5xl">🚗</span>
            <div>
              <p className="text-sm text-white/60">Текущий транспорт</p>
              <p className="text-2xl font-bold">
                {active.brandName} {active.modelName}
              </p>
              {active.year && <p className="text-sm text-white/70">{active.year} год</p>}
            </div>
          </div>

          {parts.length > 0 ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted">
                Запчасти для вашего {active.brandName} {active.modelName}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {parts.map(p => (
                  <Link
                    key={p.id}
                    href={`/catalog/${p.slug}`}
                    className="rounded-xl border border-line bg-white p-3 transition-colors hover:border-brand"
                  >
                    {p.images[0] ? (
                      <img
                        src={p.images[0].url}
                        alt={p.nameRu}
                        className="mb-2 h-24 w-full rounded object-cover"
                      />
                    ) : (
                      <div className="mb-2 h-24 w-full rounded bg-surface" />
                    )}
                    <p className="line-clamp-2 text-sm text-ink">{p.nameRu}</p>
                    <p className="mt-1 font-semibold text-ink">
                      {p.price === null
                        ? tp('priceOnRequest')
                        : `${Number(p.price).toLocaleString('ru-RU')} ₽`}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted">Запчасти для ТО</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TO_PARTS.map(part => (
                  <Link
                    key={part}
                    href={`/catalog?search=${encodeURIComponent(`${part} ${active.brandName} ${active.modelName}`)}`}
                    className="rounded-xl border border-line bg-white p-4 text-center text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                  >
                    {part}
                  </Link>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">
                Применимые товары появятся, как только поставщики привяжут запчасти к вашей модели.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">
          Добавьте транспорт, чтобы видеть подобранные запчасти и комплектующие.
        </div>
      )}
    </div>
  );
}
