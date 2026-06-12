'use client';

import {
  compatibility,
  ZODIAC_SIGNS,
  type CompatLevel,
  type CompatResult,
  type ZodiacKey,
} from '@china-ru/shared';
import { useState } from 'react';

const SELECT =
  'h-12 w-full rounded-xl border border-line bg-white px-4 text-ink outline-none focus:border-brand';

const LEVEL_STYLES: Record<CompatLevel, string> = {
  excellent: 'bg-green-50 border-green-300 text-green-800',
  good: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  neutral: 'bg-surface border-line text-ink',
  challenging: 'bg-amber-50 border-amber-200 text-amber-700',
  conflict: 'bg-red-50 border-red-200 text-red-700',
};

/** Виджет «Совместимость знаков»: ваш знак × знак партнёра → вердикт (расчёт локально). */
export function CompatibilityChecker({ compact = false }: { compact?: boolean }) {
  const [a, setA] = useState<ZodiacKey>('rat');
  const [b, setB] = useState<ZodiacKey>('rat');
  const [result, setResult] = useState<CompatResult | null>(null);

  const check = (e: React.FormEvent): void => {
    e.preventDefault();
    setResult(compatibility(a, b));
  };

  return (
    <div className={compact ? '' : 'rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8'}>
      {!compact && <h2 className="text-xl font-bold text-ink">Совместимость знаков</h2>}
      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={check}>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Ваш знак</span>
          <select
            value={a}
            onChange={e => {
              setA(e.target.value as ZodiacKey);
            }}
            className={SELECT}
          >
            {ZODIAC_SIGNS.map(s => (
              <option key={s.key} value={s.key}>
                {s.ru}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Знак партнёра
          </span>
          <select
            value={b}
            onChange={e => {
              setB(e.target.value as ZodiacKey);
            }}
            className={SELECT}
          >
            {ZODIAC_SIGNS.map(s => (
              <option key={s.key} value={s.key}>
                {s.ru}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-brand px-6 font-medium text-white hover:opacity-90 sm:w-auto"
          >
            Проверить
          </button>
        </div>
      </form>

      {result && (
        <div className={`mt-5 rounded-2xl border p-4 ${LEVEL_STYLES[result.level]}`}>
          <p className="font-semibold">{result.label}</p>
          <p className="mt-1 text-sm">{result.text}</p>
        </div>
      )}
    </div>
  );
}
