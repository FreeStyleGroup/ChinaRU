import {
  JOB_CATEGORY_LABELS,
  RESUME_EXPERIENCE_LABELS,
  type ResumePublicDto,
} from '@china-ru/shared';
import { Container } from '@china-ru/ui';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/navigation';
import { ApiError, jobsApi } from '@/lib/api';

import type { Metadata } from 'next';

/** Отображаемое имя кандидата: никнейм → имя → числовой ID. */
function candidateName(r: ResumePublicDto): string {
  return r.candidateNickname ?? r.candidateName ?? `Кандидат #${r.candidatePublicId}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const r = await jobsApi.resume(id);
    return { title: `${r.position} — ${candidateName(r)} | Резюме · China.ru` };
  } catch {
    return { title: 'Резюме | China.ru' };
  }
}

export default async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resume = await jobsApi.resume(id).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const name = candidateName(resume);

  return (
    <Container className="py-8">
      <Link href="/jobs/resumes" className="text-sm text-muted hover:text-brand">
        ← Все резюме
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-line bg-white p-6">
          <div className="flex items-center gap-4 border-b border-line pb-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-2xl font-bold text-brand">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-lg font-semibold text-ink">
                {name}
                {resume.candidateVerified && (
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white"
                    title="Верифицированный соискатель"
                  >
                    ✓
                  </span>
                )}
              </p>
              <p className="text-brand">{resume.position}</p>
              <p className="mt-0.5 text-xs text-muted">★ рейтинг {Number(resume.rating).toFixed(1)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted">
            {resume.category && (
              <span className="rounded-md bg-surface px-3 py-1">
                {JOB_CATEGORY_LABELS[resume.category].ru}
              </span>
            )}
            {resume.experience && (
              <span className="rounded-md bg-surface px-3 py-1">
                {RESUME_EXPERIENCE_LABELS[resume.experience]}
              </span>
            )}
            {resume.hskLevel && (
              <span className="rounded-md bg-surface px-3 py-1">HSK {resume.hskLevel}</span>
            )}
          </div>

          {resume.salary && (
            <p className="mt-4 text-xl font-bold text-brand">{resume.salary}</p>
          )}

          {resume.skills && (
            <div className="mt-5">
              <h2 className="text-sm font-semibold text-ink">Ключевые навыки</h2>
              <p className="mt-1 text-sm text-ink">{resume.skills}</p>
            </div>
          )}

          {resume.about && (
            <div className="mt-5">
              <h2 className="text-sm font-semibold text-ink">О себе</h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
                {resume.about}
              </p>
            </div>
          )}
        </div>

        <aside className="h-fit space-y-3 rounded-2xl border border-line bg-white p-6">
          <p className="text-sm font-semibold text-ink">Связаться с кандидатом</p>
          <p className="text-xs text-muted">
            Контакты соискателя доступны верифицированным компаниям. Разместите вакансию, чтобы
            пригласить кандидата на собеседование.
          </p>
          <Link
            href="/cabinet/store"
            className="block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-medium text-white hover:opacity-90"
          >
            Стать работодателем
          </Link>
          <Link
            href="/jobs/resumes"
            className="block rounded-lg border border-line px-4 py-2.5 text-center text-sm text-ink hover:bg-surface"
          >
            Смотреть другие резюме
          </Link>
        </aside>
      </div>
    </Container>
  );
}
