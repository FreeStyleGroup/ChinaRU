import {
  JOB_CATEGORY_LABELS,
  JOB_WORK_TYPE_LABELS,
  type JobCategory,
  type JobListingPublicDto,
} from '@china-ru/shared';
import { Container } from '@china-ru/ui';

import { JobsTabs } from '@/components/jobs/jobs-tabs';
import { Link } from '@/i18n/navigation';
import { jobsApi } from '@/lib/api';

import type { Metadata } from 'next';

/** Популярные города для быстрого фильтра (как в Bitrix-разделе «Работа в Китае»). */
const POPULAR_CITIES = ['Пекин', 'Шанхай', 'Гуанчжоу', 'Шэньчжэнь', 'Иу', 'Гонконг'];

/** Преимущества работы в Китае (блок «Почему Китай»). */
const WHY_CHINA = [
  { icon: '💰', title: 'Высокие зарплаты', text: 'Конкурентные оклады и релокейт-пакеты от работодателей.' },
  { icon: '🌏', title: 'Карьера в Азии', text: 'Опыт в крупнейшей экономике мира и международных компаниях.' },
  { icon: '🈶', title: 'Языковая практика', text: 'Подтверждённый HSK повышает рейтинг и шансы на оффер.' },
  { icon: '🤝', title: 'Прямые предложения', text: 'Вакансии напрямую от проверенных компаний без посредников.' },
];

export const metadata: Metadata = {
  title: 'Работа в Китае — вакансии от ведущих компаний | China.ru',
  description:
    'Вакансии от ведущих компаний Китая: IT, торговля, образование, маркетинг и не только. Прямые предложения и релокейт-пакеты.',
};

function salary(v: JobListingPublicDto): string | null {
  const cur = v.currency === 'rub' ? '₽' : v.currency === 'cny' ? '¥' : v.currency.toUpperCase();
  if (v.salaryMin && v.salaryMax)
    return `${v.salaryMin.toLocaleString('ru-RU')}–${v.salaryMax.toLocaleString('ru-RU')} ${cur}`;
  if (v.salaryMin) return `от ${v.salaryMin.toLocaleString('ru-RU')} ${cur}`;
  if (v.salaryMax) return `до ${v.salaryMax.toLocaleString('ru-RU')} ${cur}`;
  return null;
}

function VacancyCard({ v }: { v: JobListingPublicDto }) {
  const pay = salary(v);
  return (
    <Link
      href={`/jobs/${v.id}`}
      className="block rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-sm font-bold text-brand">
          {v.companyName.slice(0, 1)}
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-ink">
          {v.companyName}
          {v.companyVerified && (
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white"
              title="Верифицированная компания"
            >
              ✓
            </span>
          )}
        </span>
      </div>
      <p className="mt-2 font-semibold text-ink">{v.title}</p>
      {pay && <p className="mt-1 font-bold text-brand">{pay}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted">
        {v.city && <span className="rounded-md bg-surface px-2 py-1">{v.city}</span>}
        <span className="rounded-md bg-surface px-2 py-1">
          {JOB_WORK_TYPE_LABELS[v.workType] ?? v.workType}
        </span>
        {v.category && (
          <span className="rounded-md bg-surface px-2 py-1">
            {JOB_CATEGORY_LABELS[v.category].ru}
          </span>
        )}
        {v.hskLevel && <span className="rounded-md bg-surface px-2 py-1">HSK {v.hskLevel}</span>}
      </div>
    </Link>
  );
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const activeCategory =
    sp.category && sp.category in JOB_CATEGORY_LABELS ? (sp.category as JobCategory) : undefined;

  const [list, counts] = await Promise.all([
    jobsApi
      .vacancies({
        ...(activeCategory ? { category: activeCategory } : {}),
        ...(sp.city ? { city: sp.city } : {}),
        ...(sp.search ? { search: sp.search } : {}),
      })
      .catch(() => ({ items: [] as JobListingPublicDto[], total: 0, page: 1, pageSize: 20, totalPages: 0 })),
    jobsApi.categoryCounts().catch(() => []),
  ]);
  const countMap = new Map(counts.map(c => [c.category, c.count]));

  return (
    <Container className="py-8">
      <JobsTabs active="vacancies" />

      {/* Hero */}
      <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-accent p-8 text-white sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Вакансии · Резюме · Карьера
        </p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Работа в Китае</h1>
        <p className="mt-3 max-w-xl text-sm text-white/85">
          Вакансии от ведущих компаний Китая. Карьера в технологиях, торговле, образовании и
          бизнесе. Прямые предложения, релокейт-пакеты, IT и не только.
        </p>
        <form className="mt-6 flex max-w-xl gap-2">
          <input
            name="search"
            defaultValue={sp.search ?? ''}
            placeholder="Должность или ключевые слова…"
            className="h-12 flex-1 rounded-xl px-4 text-ink outline-none"
          />
          <button type="submit" className="rounded-xl bg-ink px-6 font-medium text-white">
            Найти
          </button>
        </form>
      </section>

      {/* Категории */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-ink">Категории вакансий</h2>
        <p className="text-sm text-muted">По сферам деятельности</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(JOB_CATEGORY_LABELS) as JobCategory[]).map(key => {
            const active = key === activeCategory;
            return (
              <Link
                key={key}
                href={active ? '/jobs' : `/jobs?category=${key}`}
                className={`rounded-2xl border p-4 transition-colors ${
                  active ? 'border-brand bg-brand/5' : 'border-line bg-white hover:border-brand'
                }`}
              >
                <p className="text-lg font-bold text-brand">{JOB_CATEGORY_LABELS[key].zh}</p>
                <p className="mt-1 text-sm font-medium text-ink">{JOB_CATEGORY_LABELS[key].ru}</p>
                <p className="text-xs text-muted">{countMap.get(key) ?? 0} вакансий</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Популярные города */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-ink">Популярные города</h2>
        <p className="text-sm text-muted">Где больше всего предложений</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {POPULAR_CITIES.map(city => {
            const active = city === sp.city;
            return (
              <Link
                key={city}
                href={active ? '/jobs' : `/jobs?city=${encodeURIComponent(city)}`}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  active
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-white text-ink hover:border-brand'
                }`}
              >
                {city}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Вакансии */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">
            {activeCategory ? JOB_CATEGORY_LABELS[activeCategory].ru : 'Все вакансии'}
            <span className="ml-2 text-sm font-normal text-muted">{list.total}</span>
          </h2>
          {(activeCategory ?? sp.search ?? sp.city) && (
            <Link href="/jobs" className="text-sm text-brand hover:underline">
              Сбросить фильтры
            </Link>
          )}
        </div>
        {list.items.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line p-12 text-center text-muted">
            Вакансий по вашему запросу пока нет.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.items.map(v => (
              <VacancyCard key={v.id} v={v} />
            ))}
          </div>
        )}
      </section>

      {/* Почему Китай */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">Почему работать в Китае</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CHINA.map(b => (
            <div key={b.title} className="rounded-2xl border border-line bg-white p-5">
              <span className="text-3xl">{b.icon}</span>
              <p className="mt-3 font-semibold text-ink">{b.title}</p>
              <p className="mt-1 text-sm text-muted">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA для соискателей и работодателей */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="font-semibold text-ink">Ищете работу?</p>
          <p className="mt-1 text-sm text-muted">
            Создайте резюме в личном кабинете — после проверки оно появится в базе для работодателей.
          </p>
          <Link
            href="/cabinet/jobs"
            className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Создать резюме
          </Link>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="font-semibold text-ink">Ищете сотрудников?</p>
          <p className="mt-1 text-sm text-muted">
            Станьте работодателем, разместите вакансию и получайте отклики от кандидатов.
          </p>
          <Link
            href="/jobs/resumes"
            className="mt-3 inline-block rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-brand"
          >
            Смотреть резюме
          </Link>
        </div>
      </section>
    </Container>
  );
}
