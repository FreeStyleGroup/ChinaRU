import { JOB_CATEGORY_LABELS, JOB_WORK_TYPE_LABELS } from '@china-ru/shared';
import { Container } from '@china-ru/ui';
import { notFound } from 'next/navigation';


import { Link } from '@/i18n/navigation';
import { ApiError, jobsApi } from '@/lib/api';

import { ApplyButton } from './apply-button';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const v = await jobsApi.vacancy(id);
    return { title: `${v.title} — ${v.companyName} | Работа в Китае` };
  } catch {
    return { title: 'Вакансия | China.ru' };
  }
}

export default async function VacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vacancy = await jobsApi.vacancy(id).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });

  const cur =
    vacancy.currency === 'rub' ? '₽' : vacancy.currency === 'cny' ? '¥' : vacancy.currency.toUpperCase();
  const pay =
    vacancy.salaryMin && vacancy.salaryMax
      ? `${vacancy.salaryMin.toLocaleString('ru-RU')}–${vacancy.salaryMax.toLocaleString('ru-RU')} ${cur}`
      : vacancy.salaryMin
        ? `от ${vacancy.salaryMin.toLocaleString('ru-RU')} ${cur}`
        : null;

  return (
    <Container className="py-8">
      <Link href="/jobs" className="text-sm text-muted hover:text-brand">
        ← Все вакансии
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-lg font-bold text-brand">
              {vacancy.companyName.slice(0, 1)}
            </span>
            <div>
              <p className="flex items-center gap-1 font-medium text-ink">
                {vacancy.companyName}
                {vacancy.companyVerified && (
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white"
                    title="Верифицированная компания"
                  >
                    ✓
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">★ {Number(vacancy.companyRating).toFixed(1)}</p>
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-ink">{vacancy.title}</h1>
          {pay && <p className="mt-1 text-xl font-bold text-brand">{pay}</p>}

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted">
            {vacancy.city && <span className="rounded-md bg-surface px-3 py-1">📍 {vacancy.city}</span>}
            <span className="rounded-md bg-surface px-3 py-1">
              {JOB_WORK_TYPE_LABELS[vacancy.workType] ?? vacancy.workType}
            </span>
            {vacancy.category && (
              <span className="rounded-md bg-surface px-3 py-1">
                {JOB_CATEGORY_LABELS[vacancy.category].ru}
              </span>
            )}
            {vacancy.hskLevel && (
              <span className="rounded-md bg-surface px-3 py-1">HSK {vacancy.hskLevel}</span>
            )}
          </div>

          <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-ink">
            {vacancy.description}
          </div>
        </div>

        <aside className="h-fit space-y-3 rounded-2xl border border-line bg-white p-6">
          <p className="text-sm font-semibold text-ink">Откликнуться на вакансию</p>
          <p className="text-xs text-muted">
            Работодатель увидит ваш отклик и сможет связаться с вами.
          </p>
          <ApplyButton vacancyId={vacancy.id} />
        </aside>
      </div>
    </Container>
  );
}
