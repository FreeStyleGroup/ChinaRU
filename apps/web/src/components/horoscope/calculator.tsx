'use client';

import { signByDate, type ZodiacSign } from '@china-ru/shared';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const YEARS = Array.from({ length: 2031 - 1940 + 1 }, (_, i) => 2031 - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const SELECT =
  'h-12 w-full rounded-xl border border-line bg-white px-4 text-ink outline-none focus:border-brand';

/** Калькулятор «Ваш Китайский Гороскоп»: дата рождения → знак (расчёт локально). */
export function HoroscopeCalculator() {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('1990');
  const [result, setResult] = useState<ZodiacSign | null>(null);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const y = Number(year);
    const m = month === '' ? 6 : Number(month);
    const d = day === '' ? 15 : Number(day);
    setResult(signByDate(d, m, y));
  };

  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-ink">Ваш Китайский Гороскоп</h2>
      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={submit}>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">День</span>
          <select
            value={day}
            onChange={e => {
              setDay(e.target.value);
            }}
            className={SELECT}
          >
            <option value="">День</option>
            {DAYS.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Месяц</span>
          <select
            value={month}
            onChange={e => {
              setMonth(e.target.value);
            }}
            className={SELECT}
          >
            <option value="">Месяц</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Год рождения
          </span>
          <select
            value={year}
            onChange={e => {
              setYear(e.target.value);
            }}
            className={SELECT}
          >
            {YEARS.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-brand px-6 font-medium text-white hover:opacity-90 sm:w-auto"
          >
            Узнать судьбу
          </button>
        </div>
      </form>

      {result && (
        <Link
          href={`/horoscope/${result.key}`}
          className="mt-5 flex items-center gap-5 rounded-2xl bg-gradient-to-br from-brand to-accent p-5 text-white transition-opacity hover:opacity-95"
        >
          <span className="text-6xl leading-none">{result.emoji}</span>
          <div>
            <p className="text-sm text-white/70">Ваш знак — нажмите, чтобы узнать больше</p>
            <p className="text-2xl font-bold">
              {result.ru} <span className="text-white/80">{result.cn}</span>
            </p>
            <p className="mt-1 text-sm text-white/85">
              Стихия знака: {result.element} · {result.short}
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}
