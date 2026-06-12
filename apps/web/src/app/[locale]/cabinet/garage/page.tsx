'use client';

/**
 * Мой гараж — список авто пользователя, добавление (марка/модель/год), запчасти для ТО
 * под выбранное авто, подбор шин и дисков. Марки/модели — китайский автопарк
 * (перенос из боевого china:cabinet). Состояние локальное (демо); привязка к каталогу позже.
 */
import { useState } from 'react';

const CAR_BRANDS: Record<string, { name: string; models: string[] }> = {
  haval: { name: 'Haval', models: ['Jolion', 'F7', 'F7x', 'H5', 'H9', 'Dargo', 'M6'] },
  chery: {
    name: 'Chery',
    models: ['Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 7 Pro Max', 'Tiggo 8 Pro', 'Tiggo 8 Pro Max', 'Arrizo 8'],
  },
  geely: { name: 'Geely', models: ['Coolray', 'Atlas Pro', 'Monjaro', 'Tugella', 'Emgrand'] },
  changan: {
    name: 'Changan',
    models: ['CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'UNI-K', 'UNI-V', 'UNI-T'],
  },
  exeed: { name: 'Exeed', models: ['TXL', 'VX', 'LX', 'RX'] },
  omoda: { name: 'Omoda', models: ['C5', 'S5', 'C5 New'] },
  jaecoo: { name: 'Jaecoo', models: ['J7', 'J8'] },
  tank: { name: 'Tank', models: ['300', '500'] },
  jetour: { name: 'Jetour', models: ['Dashing', 'X70 Plus', 'T2'] },
  byd: { name: 'BYD', models: ['Song Plus', 'Han', 'Tang', 'Seal', 'Dolphin'] },
  dongfeng: { name: 'Dongfeng', models: ['580', 'ix5', 'Huge'] },
  faw: { name: 'FAW', models: ['Bestune T77', 'Bestune T99'] },
  zeekr: { name: 'Zeekr', models: ['001', '007', 'X'] },
  voyah: { name: 'Voyah', models: ['Free', 'Dream'] },
  greatwall: { name: 'Great Wall', models: ['Wingle 7', 'Poer'] },
};

const TO_PARTS = [
  'Моторное масло',
  'Масляный фильтр',
  'Воздушный фильтр',
  'Салонный фильтр',
  'Свечи зажигания',
  'Тормозные колодки',
];

interface Car {
  brand: string;
  model: string;
  year: number;
}

const SEED: Car[] = [{ brand: 'Haval', model: 'Jolion', year: 2023 }];
const CURRENT_YEAR = 2026;
const YEARS = Array.from({ length: CURRENT_YEAR - 1999 }, (_, i) => CURRENT_YEAR - i);

export default function GaragePage() {
  const [cars, setCars] = useState<Car[]>(SEED);
  const [activeIdx, setActiveIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [brandKey, setBrandKey] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(CURRENT_YEAR);

  const models = brandKey ? (CAR_BRANDS[brandKey]?.models ?? []) : [];
  const active = cars[activeIdx];

  const addCar = (): void => {
    const brand = brandKey ? CAR_BRANDS[brandKey]?.name : undefined;
    if (!brand || !model) return;
    setCars(prev => [...prev, { brand, model, year }]);
    setActiveIdx(cars.length);
    setAdding(false);
    setBrandKey('');
    setModel('');
    setYear(CURRENT_YEAR);
  };

  const removeCar = (idx: number): void => {
    setCars(prev => prev.filter((_, i) => i !== idx));
    setActiveIdx(0);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Мой гараж</h1>

      <div className="flex flex-wrap items-center gap-2">
        {cars.map((c, i) => (
          <button
            key={`${c.brand}-${c.model}-${i}`}
            type="button"
            onClick={() => {
              setActiveIdx(i);
            }}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              i === activeIdx
                ? 'border-brand bg-brand/10 font-medium text-brand'
                : 'border-line text-muted hover:bg-surface'
            }`}
          >
            {c.brand} {c.model}
            <span
              role="button"
              tabIndex={0}
              onClick={e => {
                e.stopPropagation();
                removeCar(i);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  removeCar(i);
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
          + Добавить авто
        </button>
      </div>

      {adding && (
        <div className="grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-[1fr_1fr_auto_auto]">
          <select
            value={brandKey}
            onChange={e => {
              setBrandKey(e.target.value);
              setModel('');
            }}
            className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand"
          >
            <option value="">Марка</option>
            {Object.entries(CAR_BRANDS).map(([key, b]) => (
              <option key={key} value={key}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={model}
            onChange={e => {
              setModel(e.target.value);
            }}
            disabled={!brandKey}
            className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand disabled:bg-surface"
          >
            <option value="">Модель</option>
            {models.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
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
          <button
            type="button"
            onClick={addCar}
            disabled={!brandKey || !model}
            className="h-11 rounded-lg bg-brand px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      )}

      {active ? (
        <>
          <div className="flex items-center gap-5 rounded-2xl bg-ink p-6 text-white">
            <span className="text-5xl">🚗</span>
            <div>
              <p className="text-sm text-white/60">Текущий автомобиль</p>
              <p className="text-2xl font-bold">
                {active.brand} {active.model}
              </p>
              <p className="text-sm text-white/70">{active.year} год</p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-muted">Запчасти для ТО</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TO_PARTS.map(part => (
                <a
                  key={part}
                  href={`/catalog?q=${encodeURIComponent(`${part} ${active.brand} ${active.model}`)}`}
                  className="rounded-xl border border-line bg-white p-4 text-center text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  {part}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-5">
              <div>
                <p className="font-semibold text-ink">Шины</p>
                <p className="text-sm text-muted">Подбор по вашему авто</p>
              </div>
              <a
                href={`/catalog?q=${encodeURIComponent(`шины ${active.brand} ${active.model}`)}`}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"
              >
                Подобрать шины
              </a>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-5">
              <div>
                <p className="font-semibold text-ink">Диски</p>
                <p className="text-sm text-muted">Подбор по вашему авто</p>
              </div>
              <a
                href={`/catalog?q=${encodeURIComponent(`диски ${active.brand} ${active.model}`)}`}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"
              >
                Подобрать диски
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">
          Добавьте автомобиль, чтобы видеть подобранные запчасти для ТО, шины и диски.
        </div>
      )}

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — привязка к каталогу запчастей подключается позже.
      </p>
    </div>
  );
}
