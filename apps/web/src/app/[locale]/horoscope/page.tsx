import {
  FIVE_ELEMENTS,
  HOROSCOPE_HERO_IMAGE,
  zodiacImage,
  ZODIAC_SIGNS,
  type ElementName,
} from '@china-ru/shared';
import { Container } from '@china-ru/ui';

import { NewsBlock } from '@/components/content/news-block';
import { HoroscopeCalculator } from '@/components/horoscope/calculator';
import { CompatibilityChecker } from '@/components/horoscope/compatibility-checker';
import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Китайский гороскоп — знаки, стихии, совместимость | China.ru',
  description:
    'Откройте древние секреты восточной мудрости: 12 знаков китайского зодиака, пять стихий и совместимость. Узнайте свой знак по году рождения.',
};

/** Цвета карточек стихий (как в боевом разделе «Пять стихий»). */
const ELEMENT_CARD: Record<ElementName, { bg: string; char: string }> = {
  Дерево: { bg: 'bg-emerald-900', char: 'text-emerald-300' },
  Огонь: { bg: 'bg-red-900', char: 'text-red-300' },
  Земля: { bg: 'bg-amber-900', char: 'text-amber-300' },
  Металл: { bg: 'bg-zinc-800', char: 'text-zinc-200' },
  Вода: { bg: 'bg-blue-950', char: 'text-blue-300' },
};

export default function HoroscopePage() {
  return (
    <Container className="py-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl p-8 text-white sm:p-14">
        <img
          src={HOROSCOPE_HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a0808]/95 via-[#3a1010]/80 to-[#3a1010]/20" />
        <div className="relative">
          <span className="pointer-events-none text-5xl font-black leading-none text-amber-300/70">
            生肖
          </span>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">КИТАЙСКИЙ ГОРОСКОП</h1>
          <p className="mt-4 max-w-xl text-sm text-white/90 sm:text-base">
            Откройте древние секреты восточной мудрости. Узнайте, как год вашего рождения влияет на
            характер, карьеру и личные отношения.
          </p>
        </div>
      </section>

      {/* Калькулятор */}
      <div className="mt-6">
        <HoroscopeCalculator />
      </div>

      {/* Знаки */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold text-ink">Знаки китайского гороскопа</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ZODIAC_SIGNS.map(s => (
            <Link
              key={s.key}
              href={`/horoscope/${s.key}`}
              className="group overflow-hidden rounded-2xl bg-[#1a0808] text-white transition-transform hover:-translate-y-1"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={zodiacImage(s.key)}
                  alt={`Год ${s.ru}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute right-3 top-2 text-3xl font-black text-amber-300 drop-shadow-lg">
                  {s.cn}
                </span>
              </div>
              <div className="p-5">
                <p className="text-lg font-bold">Год {s.ru}</p>
                <p className="mt-1 line-clamp-3 text-xs text-white/70">{s.short}</p>
                <p className="mt-3 text-[11px] font-medium text-amber-300/90">
                  {s.years.slice(-6).join(' · ')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Совместимость */}
      <section className="mt-10">
        <CompatibilityChecker />
        <div className="mt-3">
          <Link href="/horoscope/compatibility" className="text-sm font-medium text-brand hover:underline">
            Подробная таблица совместимости →
          </Link>
        </div>
      </section>

      {/* Пять стихий */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold text-ink">Пять стихий</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          В китайском гороскопе каждый знак связан со стихией — она формирует характер и судьбу. Пять
          стихий взаимодействуют в циклах созидания и разрушения.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {FIVE_ELEMENTS.map(el => {
            const c = ELEMENT_CARD[el.name];
            return (
              <div key={el.name} className={`rounded-2xl ${c.bg} p-5 text-white`}>
                <p className={`text-5xl font-black ${c.char}`}>{el.char}</p>
                <p className="mt-3 text-lg font-bold">{el.name}</p>
                <p className="mt-1 text-xs text-white/75">{el.desc}</p>
                <p className="mt-2 text-[11px] text-white/60">
                  {el.season} · {el.color}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Таблица по годам */}
      <section className="mt-10 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-ink">Знаки зодиака по годам</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-3 pr-4 font-medium">Знак</th>
                <th className="py-3 pr-4 font-medium">Стихия</th>
                <th className="py-3 font-medium">Годы</th>
              </tr>
            </thead>
            <tbody>
              {ZODIAC_SIGNS.map(s => (
                <tr key={s.key} className="border-b border-line/60">
                  <td className="py-3 pr-4">
                    <Link href={`/horoscope/${s.key}`} className="font-semibold text-brand hover:underline">
                      {s.ru} {s.cn}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted">{s.element}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {s.years.map(y => (
                        <span key={y} className="rounded-md bg-surface px-2 py-0.5 text-xs text-ink">
                          {y}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Новости гороскопа — блок Контент-завода */}
      <NewsBlock section="horoscope" title="Новости гороскопа" />
    </Container>
  );
}
