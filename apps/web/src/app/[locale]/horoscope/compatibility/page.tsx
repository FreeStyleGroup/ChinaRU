import {
  zodiacByKey,
  ZODIAC_BEST_PAIRS,
  ZODIAC_CONFLICT_PAIRS,
  ZODIAC_TRIADS,
  type ZodiacKey,
} from '@china-ru/shared';
import { Container } from '@china-ru/ui';

import { CompatibilityChecker } from '@/components/horoscope/compatibility-checker';
import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Совместимость знаков китайского гороскопа — Сань Хэ, Лю Хэ, Лю Чун | China.ru',
  description:
    'Совместимость по китайскому зодиаку: тройки гармоний (Сань Хэ), шесть идеальных пар (Лю Хэ) и шесть конфликтов (Лю Чун). Проверьте свою пару.',
};

const TRIAD_NOTES = ['Интеллект и действие', 'Глубокомыслие и надёжность', 'Свобода и честность', 'Миролюбие и творчество'];

function ru(key: ZodiacKey): { ru: string; cn: string; emoji: string } {
  const s = zodiacByKey(key);
  return s ? { ru: s.ru, cn: s.cn, emoji: s.emoji } : { ru: key, cn: '', emoji: '' };
}

export default function CompatibilityPage() {
  return (
    <Container className="py-8">
      <Link href="/horoscope" className="text-sm text-muted hover:text-brand">
        ← Все знаки
      </Link>

      <section className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a0d0d] to-[#140606] p-8 text-white sm:p-12">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-300/80">
          Китайский гороскоп
        </span>
        <h1 className="mt-2 text-4xl font-black sm:text-5xl">Совместимость знаков</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/85">
          В китайском зодиаке совместимость описана системами Сань Хэ (тройки гармоний), Лю Хэ
          (шесть идеальных пар) и Лю Чун (шесть конфликтов). Проверьте свою пару и изучите полную
          таблицу.
        </p>
      </section>

      <div className="mt-6">
        <CompatibilityChecker />
      </div>

      {/* Сань Хэ */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold text-ink">Тройки гармоний · Сань Хэ (三合)</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Знаки каждой тройки обладают наилучшей взаимной совместимостью и дополняют друг друга на
          энергетическом уровне.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ZODIAC_TRIADS.map((triad, i) => (
            <div
              key={triad.join('-')}
              className="rounded-2xl bg-gradient-to-br from-[#2a0d0d] to-[#160707] p-5 text-white"
            >
              <div className="flex items-center justify-center gap-2 text-2xl font-black text-amber-300">
                {triad.map((k, idx) => (
                  <span key={k}>
                    {ru(k).cn}
                    {idx < triad.length - 1 && <span className="text-white/40"> + </span>}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-center text-sm">
                {triad.map(k => ru(k).ru).join(', ')}
              </p>
              <p className="mt-2 text-center text-xs text-white/60">{TRIAD_NOTES[i]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Лю Хэ */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold text-ink">Лучшие пары · Лю Хэ (六合)</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Шесть идеальных пар по китайской зодиакальной совместимости — наиболее гармоничные союзы в
          любви и дружбе.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ZODIAC_BEST_PAIRS.map(([a, b]) => (
            <div
              key={`${a}-${b}`}
              className="flex items-center justify-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5"
            >
              <Pair k={a} />
              <span className="text-xl text-green-500">❤</span>
              <Pair k={b} />
            </div>
          ))}
        </div>
      </section>

      {/* Лю Чун */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold text-ink">Конфликтные пары · Лю Чун (六冲)</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Шесть пар прямого противостояния. Союз возможен, но потребует терпения, уважения границ и
          компромиссов.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ZODIAC_CONFLICT_PAIRS.map(([a, b]) => (
            <div
              key={`${a}-${b}`}
              className="flex items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-5"
            >
              <Pair k={a} />
              <span className="text-xl text-red-400">⚡</span>
              <Pair k={b} />
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}

function Pair({ k }: { k: ZodiacKey }) {
  const s = ru(k);
  return (
    <Link href={`/horoscope/${k}`} className="flex items-center gap-2 hover:opacity-80">
      <span className="text-3xl">{s.emoji}</span>
      <span className="text-sm font-semibold text-ink">
        {s.ru} <span className="text-muted">{s.cn}</span>
      </span>
    </Link>
  );
}
