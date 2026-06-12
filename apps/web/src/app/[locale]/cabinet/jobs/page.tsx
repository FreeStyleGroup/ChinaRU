'use client';

/**
 * Работа — резюме соискателя (реальный API): создание/редактирование, шкала заполненности,
 * сфера, опыт, подтверждённый HSK, рейтинг (растёт за документы/сертификаты), статус
 * модерации (на проверке → опубликовано в «Вакансии» / отклонено). Отклики — позже.
 */
import {
  JOB_APPLICATION_STATUS_LABELS,
  JOB_CATEGORY_LABELS,
  RESUME_EXPERIENCE_LABELS,
  type JobCategory,
  type MyApplicationDto,
  type ResumeDto,
  type ResumeExperience,
  type UpsertResumeInput,
} from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/cabinet/tabs';
import { Link } from '@/i18n/navigation';
import { jobClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface Draft {
  position: string;
  category: '' | JobCategory;
  salary: string;
  experience: '' | ResumeExperience;
  skills: string;
  about: string;
  hskLevel: '' | number;
}

const EMPTY: Draft = {
  position: '',
  category: '',
  salary: '',
  experience: '',
  skills: '',
  about: '',
  hskLevel: '',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: '⏳ На проверке', cls: 'bg-amber-50 text-amber-600' },
  published: { label: '✓ Опубликовано', cls: 'bg-green-100 text-green-700' },
  rejected: { label: '✕ Отклонено', cls: 'bg-red-100 text-red-600' },
};

function fromDto(r: ResumeDto): Draft {
  return {
    position: r.position,
    category: r.category ?? '',
    salary: r.salary ?? '',
    experience: r.experience ?? '',
    skills: r.skills ?? '',
    about: r.about ?? '',
    hskLevel: r.hskLevel ?? '',
  };
}

/** Процент заполненности: доля заполненных полей резюме. */
function completeness(d: Draft): number {
  const fields = [d.position, d.category, d.salary, d.experience, d.skills, d.about, d.hskLevel];
  const filled = fields.filter(v => v !== '' && v !== null).length;
  return Math.round((filled / fields.length) * 100);
}

export default function JobsPage() {
  const { user } = useAuth();
  const [resume, setResume] = useState<ResumeDto | null>(null);
  const [applications, setApplications] = useState<MyApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      jobClient.getResume().catch(() => null),
      jobClient.myApplications().catch(() => []),
    ])
      .then(([r, apps]) => {
        if (cancelled) return;
        setResume(r);
        if (r) setDraft(fromDto(r));
        setApplications(apps);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pct = completeness(draft);
  const showForm = editing || !resume;

  const save = async (): Promise<void> => {
    if (!draft.position.trim()) return;
    setSaving(true);
    try {
      const input: UpsertResumeInput = {
        position: draft.position.trim(),
        ...(draft.category ? { category: draft.category } : {}),
        ...(draft.salary.trim() ? { salary: draft.salary.trim() } : {}),
        ...(draft.experience ? { experience: draft.experience } : {}),
        ...(draft.skills.trim() ? { skills: draft.skills.trim() } : {}),
        ...(draft.about.trim() ? { about: draft.about.trim() } : {}),
        ...(draft.hskLevel !== '' ? { hskLevel: Number(draft.hskLevel) } : {}),
      };
      const saved = await jobClient.upsertResume(input);
      setResume(saved);
      setDraft(fromDto(saved));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted">Загрузка…</p>;

  const initial = (user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase();
  const status = resume ? STATUS_META[resume.moderationStatus] : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Работа</h1>
        <Link
          href="/jobs"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Найти вакансии
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Моё резюме</h2>
          {resume && !editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
              }}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface"
            >
              Редактировать
            </button>
          )}
        </div>

        {/* Шкала заполненности */}
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink">Заполненность резюме</span>
            <span className={pct === 100 ? 'font-semibold text-green-600' : 'text-muted'}>
              {pct}%
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-brand'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct < 100 && (
            <p className="mt-2 text-xs text-muted">
              Заполните больше полей — так резюме привлекательнее для работодателей.
            </p>
          )}
        </div>

        {resume && !editing && status && (
          <div className="rounded-2xl border border-line bg-white p-6">
            <div className="flex items-center gap-4 border-b border-line pb-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand">
                {initial}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-ink">{user?.name ?? 'Соискатель'}</p>
                <p className="text-sm text-brand">{resume.position}</p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.cls}`}>
                  {status.label}
                </span>
                <p className="mt-1 text-xs text-muted">★ рейтинг {Number(resume.rating).toFixed(1)}</p>
              </div>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {resume.category && (
                <Row label="Сфера" value={JOB_CATEGORY_LABELS[resume.category].ru} />
              )}
              {resume.salary && <Row label="Зарплата" value={resume.salary} />}
              {resume.experience && (
                <Row label="Опыт" value={RESUME_EXPERIENCE_LABELS[resume.experience]} />
              )}
              {resume.hskLevel && <Row label="HSK" value={`Уровень ${resume.hskLevel}`} />}
              {resume.skills && <Row label="Навыки" value={resume.skills} full />}
              {resume.about && <Row label="О себе" value={resume.about} full />}
            </dl>
            {resume.moderationStatus === 'rejected' && resume.rejectionReason && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                Причина отклонения: {resume.rejectionReason}
              </p>
            )}
            <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
              После одобрения модератором резюме появится в разделе «Вакансии» и станет видно
              работодателям.
            </p>
          </div>
        )}

        {showForm && (
          <form
            className="space-y-4 rounded-2xl border border-line bg-white p-6"
            onSubmit={e => {
              e.preventDefault();
              void save();
            }}
          >
            {!resume && (
              <div className="flex items-center gap-4 rounded-xl bg-surface p-4">
                <span className="text-3xl">📄</span>
                <div>
                  <p className="font-semibold text-ink">Создайте резюме</p>
                  <p className="text-sm text-muted">
                    Заполните информацию о себе, чтобы работодатели могли вас найти.
                  </p>
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Желаемая должность *" full>
                <input
                  required
                  value={draft.position}
                  onChange={e => {
                    setDraft({ ...draft, position: e.target.value });
                  }}
                  placeholder="Например: Менеджер по ВЭД"
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                />
              </Field>
              <Field label="Сфера">
                <select
                  value={draft.category}
                  onChange={e => {
                    setDraft({ ...draft, category: e.target.value as Draft['category'] });
                  }}
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                >
                  <option value="">Не выбрана</option>
                  {(Object.keys(JOB_CATEGORY_LABELS) as JobCategory[]).map(k => (
                    <option key={k} value={k}>
                      {JOB_CATEGORY_LABELS[k].ru}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Желаемая зарплата">
                <input
                  value={draft.salary}
                  onChange={e => {
                    setDraft({ ...draft, salary: e.target.value });
                  }}
                  placeholder="от 100 000 ₽"
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                />
              </Field>
              <Field label="Опыт работы">
                <select
                  value={draft.experience}
                  onChange={e => {
                    setDraft({ ...draft, experience: e.target.value as Draft['experience'] });
                  }}
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                >
                  <option value="">Выберите</option>
                  {(Object.keys(RESUME_EXPERIENCE_LABELS) as ResumeExperience[]).map(k => (
                    <option key={k} value={k}>
                      {RESUME_EXPERIENCE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Уровень HSK">
                <select
                  value={draft.hskLevel}
                  onChange={e => {
                    setDraft({
                      ...draft,
                      hskLevel: e.target.value === '' ? '' : Number(e.target.value),
                    });
                  }}
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                >
                  <option value="">Не подтверждён</option>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>
                      HSK {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ключевые навыки" full>
                <input
                  value={draft.skills}
                  onChange={e => {
                    setDraft({ ...draft, skills: e.target.value });
                  }}
                  placeholder="ВЭД, переговоры, китайский язык…"
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                />
              </Field>
              <Field label="О себе" full>
                <textarea
                  rows={4}
                  value={draft.about}
                  onChange={e => {
                    setDraft({ ...draft, about: e.target.value });
                  }}
                  placeholder="Расскажите о себе, опыте и достижениях…"
                  className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !draft.position.trim()}>
                {resume ? 'Сохранить' : 'Создать резюме'}
              </Button>
              {resume && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraft(fromDto(resume));
                    setEditing(false);
                  }}
                >
                  Отмена
                </Button>
              )}
            </div>
            <p className="text-xs text-muted">
              После сохранения резюме отправляется на проверку модератору.
            </p>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Документы и сертификаты</h2>
        <div className="rounded-2xl border border-dashed border-line p-6 text-center">
          <p className="text-sm text-muted">
            Загрузите дипломы, сертификаты и подтверждение уровня HSK нашей школы — это повышает ваш
            рейтинг у работодателей.
          </p>
          <button
            type="button"
            className="mt-3 rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface"
          >
            Загрузить документы
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Мои отклики</h2>
        {applications.length === 0 ? (
          <EmptyState
            title="Вы пока не откликались на вакансии."
            action={{ label: 'Найти вакансии', href: '/jobs' }}
          />
        ) : (
          <div className="space-y-2">
            {applications.map(a => (
              <Link
                key={a.id}
                href={`/jobs/${a.listingId}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{a.vacancyTitle}</p>
                  <p className="text-xs text-muted">
                    {a.companyName}
                    {a.vacancyCity ? ` · ${a.vacancyCity}` : ''} ·{' '}
                    {new Date(a.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">
                  {JOB_APPLICATION_STATUS_LABELS[a.status] ?? a.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
