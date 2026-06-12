'use client';

/**
 * Работа — резюме пользователя (создание/просмотр/редактирование) + отклики.
 * Структура из боевого china:cabinet (jobs.php). Состояние локальное (демо);
 * сохранение в БД и реальные отклики подключаются при сборке раздела /job/.
 */
import { Button } from '@china-ru/ui';
import { useState } from 'react';

import { EmptyState } from '@/components/cabinet/tabs';
import { useAuth } from '@/lib/auth-context';

interface Resume {
  position: string;
  salary: string;
  experience: string;
  skills: string;
  about: string;
}

const EXPERIENCE = ['Нет опыта', 'До 1 года', '1–3 года', '3–6 лет', 'Более 6 лет'];
const EMPTY: Resume = { position: '', salary: '', experience: '', skills: '', about: '' };

export default function JobsPage() {
  const { user } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Resume>(EMPTY);

  const hasResume = resume !== null && resume.position.trim() !== '';

  const startCreate = (): void => {
    setDraft(resume ?? EMPTY);
    setEditing(true);
  };

  const save = (): void => {
    if (!draft.position.trim()) return;
    setResume(draft);
    setEditing(false);
  };

  const remove = (): void => {
    setResume(null);
    setEditing(false);
  };

  const showForm = editing || !hasResume;
  const initial = (user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-ink">Работа</h1>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Моё резюме</h2>
          {hasResume && !editing && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startCreate}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface"
              >
                Редактировать
              </button>
              <button
                type="button"
                onClick={remove}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-brand"
              >
                Удалить
              </button>
            </div>
          )}
        </div>

        {hasResume && !editing && (
          <div className="rounded-2xl border border-line bg-white p-6">
            <div className="flex items-center gap-4 border-b border-line pb-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand">
                {initial}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-ink">{user?.name ?? 'Соискатель'}</p>
                <p className="text-sm text-brand">{resume.position}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
                ⏳ На проверке
              </span>
            </div>
            <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
              После одобрения модератором резюме появится в разделе «Вакансии» и станет видно
              работодателям.
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              {resume.salary && (
                <div className="flex gap-3">
                  <dt className="w-28 text-muted">Зарплата</dt>
                  <dd className="text-ink">{resume.salary}</dd>
                </div>
              )}
              {resume.experience && (
                <div className="flex gap-3">
                  <dt className="w-28 text-muted">Опыт</dt>
                  <dd className="text-ink">{resume.experience}</dd>
                </div>
              )}
              {resume.skills && (
                <div className="flex gap-3">
                  <dt className="w-28 text-muted">Навыки</dt>
                  <dd className="text-ink">{resume.skills}</dd>
                </div>
              )}
              {resume.about && (
                <div className="flex gap-3">
                  <dt className="w-28 text-muted">О себе</dt>
                  <dd className="text-ink">{resume.about}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {showForm && (
          <form
            className="space-y-4 rounded-2xl border border-line bg-white p-6"
            onSubmit={e => {
              e.preventDefault();
              save();
            }}
          >
            {!hasResume && (
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
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-ink">Желаемая должность *</span>
                <input
                  required
                  value={draft.position}
                  onChange={e => {
                    setDraft({ ...draft, position: e.target.value });
                  }}
                  placeholder="Например: Менеджер по продажам"
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">Желаемая зарплата</span>
                <input
                  value={draft.salary}
                  onChange={e => {
                    setDraft({ ...draft, salary: e.target.value });
                  }}
                  placeholder="от 100 000 ₽"
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">Опыт работы</span>
                <select
                  value={draft.experience}
                  onChange={e => {
                    setDraft({ ...draft, experience: e.target.value });
                  }}
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                >
                  <option value="">Выберите</option>
                  {EXPERIENCE.map(o => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-ink">Ключевые навыки</span>
                <input
                  value={draft.skills}
                  onChange={e => {
                    setDraft({ ...draft, skills: e.target.value });
                  }}
                  placeholder="ВЭД, переговоры, китайский язык…"
                  className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-ink">О себе</span>
                <textarea
                  rows={4}
                  value={draft.about}
                  onChange={e => {
                    setDraft({ ...draft, about: e.target.value });
                  }}
                  placeholder="Расскажите о себе, опыте и достижениях…"
                  className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!draft.position.trim()}>
                {hasResume ? 'Сохранить' : 'Создать резюме'}
              </Button>
              {hasResume && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                  }}
                >
                  Отмена
                </Button>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Отклики</h2>
        <EmptyState
          title={
            hasResume
              ? 'Откликов пока нет. Работодатели смогут откликнуться на ваше резюме.'
              : 'Откликов пока нет. Создайте резюме, чтобы получать отклики от работодателей.'
          }
        />
      </section>

      <p className="text-center text-xs text-muted">
        Демонстрационные данные — резюме и отклики подключаются вместе с разделом «Работа».
      </p>
    </div>
  );
}
