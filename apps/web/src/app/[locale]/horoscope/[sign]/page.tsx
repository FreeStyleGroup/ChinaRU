import {
  elementByYear,
  zodiacByKey,
  zodiacImage,
  ZODIAC_SIGNS,
  type ZodiacKey,
} from '@china-ru/shared';
import { Container } from '@china-ru/ui';
import { notFound } from 'next/navigation';

import { NewsBlock } from '@/components/content/news-block';
import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

export function generateStaticParams(): { sign: string }[] {
  return ZODIAC_SIGNS.map(s => ({ sign: s.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sign: string }>;
}): Promise<Metadata> {
  const { sign } = await params;
  const s = zodiacByKey(sign);
  if (!s) return { title: 'Знак не найден | China.ru' };
  return {
    title: `Год ${s.ru} (${s.cn}) — китайский гороскоп | China.ru`,
    description: s.short,
  };
}

export default async function SignPage({ params }: { params: Promise<{ sign: string }> }) {
  const { sign } = await params;
  const s = zodiacByKey(sign);
  if (!s) notFound();

  const best = s.best.map(zodiacByKey).filter((x): x is NonNullable<typeof x> => x !== null);
  const worst = s.worst.map(zodiacByKey).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <Container className="py-8">
      <Link href="/horoscope" className="text-sm text-muted hover:text-brand">
        ← Все знаки
      </Link>

      <section className="relative mt-4 overflow-hidden rounded-3xl text-white">
        <img
          src={zodiacImage(s.key)}
          alt={`Год ${s.ru}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a0808]/95 via-[#3a1010]/85 to-[#3a1010]/30" />
        <div className="relative p-8 sm:p-12">
          <div className="flex items-center gap-6">
            <span className="text-7xl leading-none drop-shadow-lg">{s.emoji}</span>
            <div>
              <p className="text-sm uppercase tracking-wider text-amber-300/90">
                {s.pinyin} · {s.element}
              </p>
              <h1 className="text-4xl font-black sm:text-5xl">
                Год {s.ru} <span className="text-amber-300/90">{s.cn}</span>
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-white/90">{s.short}</p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-xl font-bold text-ink">Характер и судьба</h2>
          <p className="mt-3 leading-relaxed text-ink">{s.full}</p>

          <h2 className="mt-8 text-xl font-bold text-ink">Годы рождения</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4 font-medium">Год</th>
                  <th className="py-2 font-medium">Стихия года</th>
                </tr>
              </thead>
              <tbody>
                {s.years.map(y => (
                  <tr key={y} className="border-b border-line/60">
                    <td className="py-2 pr-4 font-medium text-ink">{y}</td>
                    <td className="py-2 text-muted">{elementByYear(y)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="space-y-6">
          <MatchCard title="Лучшая совместимость" tone="good" signs={best} />
          <MatchCard title="Непростая совместимость" tone="bad" signs={worst} />
        </aside>
      </div>

      <NewsBlock section="horoscope" title="Новости гороскопа" />
    </Container>
  );
}

function MatchCard({
  title,
  tone,
  signs,
}: {
  title: string;
  tone: 'good' | 'bad';
  signs: { key: ZodiacKey; ru: string; emoji: string }[];
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className={`font-semibold ${tone === 'good' ? 'text-green-700' : 'text-amber-700'}`}>
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {signs.map(m => (
          <Link
            key={m.key}
            href={`/horoscope/${m.key}`}
            className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 transition-colors hover:border-brand"
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="font-medium text-ink">{m.ru}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
