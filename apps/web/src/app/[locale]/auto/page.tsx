import { Container } from '@china-ru/ui';

import { BrandGrid } from '@/components/auto/brand-grid';
import { Link } from '@/i18n/navigation';
import { autoApi } from '@/lib/api';

import type { VehicleBrandDto } from '@china-ru/shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Автомобили, мото и спецтехника из Китая — China.ru',
  description:
    'Китайский автопарк напрямую от производителей: легковые авто, мототехника (мотоциклы, скутеры, квадроциклы, снегоходы) и спецтехника. Популярные марки, официальные дилеры в России, подбор запчастей по вашему транспорту.',
};

const DIRECTIONS = [
  { id: 'auto', icon: '🚗', title: 'Автомобили', text: 'Легковые и коммерческие модели китайских марок.' },
  { id: 'moto', icon: '🏍️', title: 'Мототехника', text: 'Мотоциклы, скутеры, питбайки, квадроциклы, снегоходы.' },
  { id: 'special', icon: '🚜', title: 'Спецтехника', text: 'Экскаваторы, погрузчики, самосвалы, краны.' },
];

const MOTO_KINDS = ['Мотоциклы', 'Мопеды / скутеры', 'Питбайки', 'Квадроциклы', 'Снегоходы', 'Трициклы', 'Мотобуксировщики'];
const SPECIAL_KINDS = ['Экскаваторы', 'Погрузчики', 'Самосвалы', 'Автокраны', 'Бульдозеры'];

const EMPTY: VehicleBrandDto[] = [];

export default async function AutoPage() {
  const [auto, moto, special] = await Promise.all([
    autoApi.brands('auto').catch(() => EMPTY),
    autoApi.brands('moto').catch(() => EMPTY),
    autoApi.brands('special').catch(() => EMPTY),
  ]);
  const popularAuto = auto.filter(b => b.popular);

  return (
    <Container className="py-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-brand p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Авто · Мото · Спецтехника</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">Транспорт из Китая</h1>
        <p className="mt-3 max-w-2xl text-white/85">
          Новые автомобили, мототехника и спецтехника напрямую от китайских производителей.
          Популярные марки, официальные дилеры в России и подбор запчастей по вашему транспорту.
        </p>
        <Link
          href="/auto/dealers"
          className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand hover:opacity-90"
        >
          Официальные дилеры на карте →
        </Link>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {DIRECTIONS.map(d => (
          <a
            key={d.id}
            href={`#${d.id}`}
            className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand"
          >
            <div className="text-3xl">{d.icon}</div>
            <p className="mt-2 text-lg font-semibold text-ink">{d.title}</p>
            <p className="mt-1 text-sm text-muted">{d.text}</p>
          </a>
        ))}
      </section>

      <section id="auto" className="mt-10 scroll-mt-20">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink">Популярные марки</h2>
          <span className="text-sm text-muted">{auto.length} марок</span>
        </div>
        <BrandGrid brands={popularAuto.length > 0 ? popularAuto : auto} />
      </section>

      <section id="moto" className="mt-10 scroll-mt-20">
        <h2 className="mb-4 text-2xl font-bold text-ink">Мототехника</h2>
        <div className="mb-5 flex flex-wrap gap-2">
          {MOTO_KINDS.map(k => (
            <span key={k} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink">
              {k}
            </span>
          ))}
        </div>
        <BrandGrid brands={moto} />
      </section>

      <section id="special" className="mt-10 scroll-mt-20">
        <h2 className="mb-4 text-2xl font-bold text-ink">Спецтехника</h2>
        <div className="mb-5 flex flex-wrap gap-2">
          {SPECIAL_KINDS.map(k => (
            <span key={k} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink">
              {k}
            </span>
          ))}
        </div>
        <BrandGrid brands={special} />
      </section>

      <section className="mt-10 rounded-3xl border border-line bg-surface p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold text-ink">Уже владеете китайским авто?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          Добавьте транспорт в «Мой гараж» — и в кабинете автоматически подберутся запчасти и
          комплектующие по вашей модели.
        </p>
        <Link
          href="/cabinet/garage"
          className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Открыть «Мой гараж»
        </Link>
      </section>
    </Container>
  );
}
