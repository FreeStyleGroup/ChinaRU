'use client';

/**
 * Управление вакансиями компании: размещение (→ модерация), список со статусом,
 * отклики соискателей с принятием/отклонением. Только для верифицированной компании.
 */
import {
  JOB_APPLICATION_STATUS_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_WORK_TYPE_LABELS,
  type ApplicantDto,
  type CreateJobListingInput,
  type JobCategory,
  type JobListingDto,
} from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { ClientApiError, sellerJobClient } from '@/lib/api-client';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'На проверке', cls: 'bg-amber-50 text-amber-600' },
  published: { label: 'Опубликована', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонена', cls: 'bg-red-100 text-red-600' },
};

const WORK_TYPES = Object.keys(JOB_WORK_TYPE_LABELS);

interface Draft {
  title: string;
  category: '' | JobCategory;
  city: string;
  workType: string;
  description: string;
  salaryMin: string;
  salaryMax: string;
}

const EMPTY: Draft = {
  title: '',
  category: '',
  city: '',
  workType: 'full_time',
  description: '',
  salaryMin: '',
  salaryMax: '',
};

export function CompanyVacancies() {
  const [list, setList] = useState<JobListingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Record<string, ApplicantDto[]>>({});

  useEffect(() => {
    let cancelled = false;
    void sellerJobClient
      .myVacancies()
      .then(rows => {
        if (!cancelled) setList(rows);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const create = async (): Promise<void> => {
    setError('');
    try {
      const input: CreateJobListingInput = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        workType: draft.workType as CreateJobListingInput['workType'],
        ...(draft.category ? { category: draft.category } : {}),
        ...(draft.city.trim() ? { city: draft.city.trim() } : {}),
        ...(draft.salaryMin ? { salaryMin: Number(draft.salaryMin) } : {}),
        ...(draft.salaryMax ? { salaryMax: Number(draft.salaryMax) } : {}),
      };
      const created = await sellerJobClient.createVacancy(input);
      setList(prev => [created, ...prev]);
      setDraft(EMPTY);
      setCreating(false);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : 'Не удалось разместить вакансию');
    }
  };

  const toggleApplicants = async (id: string): Promise<void> => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!applicants[id]) {
      const rows = await sellerJobClient.applicants(id).catch(() => []);
      setApplicants(prev => ({ ...prev, [id]: rows }));
    }
  };

  const decide = async (
    vacancyId: string,
    appId: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> => {
    await sellerJobClient.setApplicationStatus(appId, status);
    setApplicants(prev => ({
      ...prev,
      [vacancyId]: (prev[vacancyId] ?? []).map(a => (a.id === appId ? { ...a, status } : a)),
    }));
  };

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">Вакансии компании</h2>
        <button
          type="button"
          onClick={() => {
            setCreating(v => !v);
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface"
        >
          {creating ? 'Отмена' : '+ Разместить вакансию'}
        </button>
      </div>

      {creating && (
        <form
          className="grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-2"
          onSubmit={e => {
            e.preventDefault();
            void create();
          }}
        >
          <input
            required
            value={draft.title}
            onChange={e => {
              setDraft({ ...draft, title: e.target.value });
            }}
            placeholder="Должность *"
            className="h-10 rounded-lg border border-line px-3 outline-none focus:border-brand sm:col-span-2"
          />
          <select
            value={draft.category}
            onChange={e => {
              setDraft({ ...draft, category: e.target.value as Draft['category'] });
            }}
            className="h-10 rounded-lg border border-line px-3 outline-none focus:border-brand"
          >
            <option value="">Сфера</option>
            {(Object.keys(JOB_CATEGORY_LABELS) as JobCategory[]).map(k => (
              <option key={k} value={k}>
                {JOB_CATEGORY_LABELS[k].ru}
              </option>
            ))}
          </select>
          <select
            value={draft.workType}
            onChange={e => {
              setDraft({ ...draft, workType: e.target.value });
            }}
            className="h-10 rounded-lg border border-line px-3 outline-none focus:border-brand"
          >
            {WORK_TYPES.map(k => (
              <option key={k} value={k}>
                {JOB_WORK_TYPE_LABELS[k]}
              </option>
            ))}
          </select>
          <input
            value={draft.city}
            onChange={e => {
              setDraft({ ...draft, city: e.target.value });
            }}
            placeholder="Город"
            className="h-10 rounded-lg border border-line px-3 outline-none focus:border-brand"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={draft.salaryMin}
              onChange={e => {
                setDraft({ ...draft, salaryMin: e.target.value });
              }}
              placeholder="Зарплата от"
              className="h-10 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
            <input
              type="number"
              value={draft.salaryMax}
              onChange={e => {
                setDraft({ ...draft, salaryMax: e.target.value });
              }}
              placeholder="до"
              className="h-10 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </div>
          <textarea
            required
            rows={3}
            value={draft.description}
            onChange={e => {
              setDraft({ ...draft, description: e.target.value });
            }}
            placeholder="Описание вакансии *"
            className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand sm:col-span-2"
          />
          {error && <p className="text-sm text-brand sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!draft.title.trim() || !draft.description.trim()}>
              Отправить на модерацию
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Загрузка…</p>
      ) : list.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Вы пока не размещали вакансии.</p>
      ) : (
        <div className="space-y-2">
          {list.map(v => {
            const meta = STATUS_META[v.moderationStatus] ?? STATUS_META.pending;
            const apps = applicants[v.id];
            return (
              <div key={v.id} className="rounded-xl border border-line">
                <div className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{v.title}</p>
                    <p className="text-xs text-muted">
                      {v.category ? JOB_CATEGORY_LABELS[v.category].ru : '—'}
                      {v.city ? ` · ${v.city}` : ''}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${meta?.cls ?? ''}`}>
                    {meta?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void toggleApplicants(v.id);
                    }}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink hover:bg-surface"
                  >
                    Отклики
                  </button>
                </div>
                {openId === v.id && (
                  <div className="border-t border-line p-3">
                    {!apps ? (
                      <p className="text-xs text-muted">Загрузка…</p>
                    ) : apps.length === 0 ? (
                      <p className="text-xs text-muted">Откликов пока нет.</p>
                    ) : (
                      <div className="space-y-2">
                        {apps.map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="text-ink">
                                {a.applicantName ?? `Соискатель #${a.applicantPublicId}`}
                              </p>
                              {a.coverLetter && (
                                <p className="truncate text-xs text-muted">{a.coverLetter}</p>
                              )}
                            </div>
                            {a.status === 'accepted' || a.status === 'rejected' ? (
                              <span className="text-xs text-muted">
                                {JOB_APPLICATION_STATUS_LABELS[a.status]}
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void decide(v.id, a.id, 'accepted');
                                  }}
                                  className="rounded-md bg-green-600 px-2.5 py-1 text-xs text-white"
                                >
                                  Принять
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void decide(v.id, a.id, 'rejected');
                                  }}
                                  className="rounded-md border border-line px-2.5 py-1 text-xs text-muted"
                                >
                                  Отклонить
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
