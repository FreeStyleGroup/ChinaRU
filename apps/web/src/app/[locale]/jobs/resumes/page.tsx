import {
  JOB_CATEGORY_LABELS,
  RESUME_EXPERIENCE_LABELS,
  type JobCategory,
  type ResumeExperience,
  type ResumePublicDto,
} from '@china-ru/shared';
import { Container } from '@china-ru/ui';

import { JobsTabs } from '@/components/jobs/jobs-tabs';
import { Link } from '@/i18n/navigation';
import { jobsApi } from '@/lib/api';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Резюме специалистов — база кандидатов | Работа в Китае · China.ru',
  description:
    'База резюме специалистов по работе с Китаем: ВЭД, переводчики, логисты, инженеры. Подтверждённый уровень HSK, рейтинг кандидатов.',
};

/** Отображаемое имя кандидата: никнейм → имя → числовой ID. */
function candidateName(r: ResumePublicDto): string {
  return r.candidateNickname ?? r.candidateName ?? `Кандидат #${r.candidatePublicId}`;
}

function ResumeCard({ r }: { r: ResumePublicDto }) {
  const name = candidateName(r);
  return (
    <Link
      href={`/jobs/resumes/${r.id}`}
      className="block rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-base font-bold text-brand">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate font-medium text-ink">
            {name}
            {r.candidateVerified && (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white"
                title="Верифицированный соискатель"
              >
                ✓
              </span>
            )}
          </p>
          <p className="text-xs text-muted">★ {Number(r.rating).toFixed(1)}</p>
        </div>
      </div>
      <p className="mt-3 font-semibold text-ink">{r.position}</p>
      {r.salary && <p className="mt-1 font-bold text-brand">{r.salary}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted">
        {r.category && (
          <span className="rounded-md bg-surface px-2 py-1">{JOB_CATEGORY_LABELS[r.category].ru}</span>
        )}
        {r.experience && (
          <span className="rounded-md bg-surface px-2 py-1">
            {RESUME_EXPERIENCE_LABELS[r.experience]}
          </span>
        )}
        {r.hskLevel && <span className="rounded-md bg-surface px-2 py-1">HSK {r.hskLevel}</span>}
      </div>
    </Link>
  );
}

export default async function ResumesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    experience?: string;
    hskLevel?: string;
    search?: string;
  }>;
}) {
  const sp = await searchParams;
  const activeCategory =
    sp.category && sp.category in JOB_CATEGORY_LABELS ? (sp.category as JobCategory) : undefined;
  const activeExperience =
    sp.experience && sp.experience in RESUME_EXPERIENCE_LABELS
      ? (sp.experience as ResumeExperience)
      : undefined;
  const hsk = sp.hskLevel && /^[1-6]$/.test(sp.hskLevel) ? Number(sp.hskLevel) : undefined;

  const list = await jobsApi
    .resumes({
      ...(activeCategory ? { category: activeCategory } : {}),
      ...(activeExperience ? { experience: activeExperience } : {}),
      ...(hsk ? { hskLevel: hsk } : {}),
      ...(sp.search ? { search: sp.search } : {}),
    })
    .catch(() => ({
      items: [] as ResumePublicDto[],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }));

  const hasFilters = Boolean(activeCategory ?? activeExperience ?? hsk ?? sp.search);

  return (
    <Container className="py-8">
      <JobsTabs active="resumes" />

      {/* Hero */}
      <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-accent p-8 text-white sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          База резюме · Кандидаты
        </p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Резюме специалистов</h1>
        <p className="mt-3 max-w-xl text-sm text-white/85">
          Готовые специалисты по работе с Китаем: ВЭД, переводчики, логисты, инженеры. Подтверждённый
          уровень HSK и рейтинг кандидатов.
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
        <h2 className="text-xl font-bold text-ink">Сфера деятельности</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(JOB_CATEGORY_LABELS) as JobCategory[]).map(key => {
            const active = key === activeCategory;
            return (
              <Link
                key={key}
                href={active ? '/jobs/resumes' : `/jobs/resumes?category=${key}`}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  active
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-white text-ink hover:border-brand'
                }`}
              >
                {JOB_CATEGORY_LABELS[key].ru}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Резюме */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">
            {activeCategory ? JOB_CATEGORY_LABELS[activeCategory].ru : 'Все резюме'}
            <span className="ml-2 text-sm font-normal text-muted">{list.total}</span>
          </h2>
          {hasFilters && (
            <Link href="/jobs/resumes" className="text-sm text-brand hover:underline">
              Сбросить фильтры
            </Link>
          )}
        </div>
        {list.items.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line p-12 text-center text-muted">
            Резюме по вашему запросу пока нет.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.items.map(r => (
              <ResumeCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}
