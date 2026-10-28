import { JOB_CATEGORY_LABELS, MODERATION_STATUS_LABELS, RESUME_EXPERIENCE_LABELS } from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';


import { DataTable, type Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';

import type { ContentModerationInput, ResumeDto } from '@china-ru/shared';

export function ResumesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.resumes({ status: 'pending', pageSize: 50 }),
  });

  const moderate = useMutation({
    mutationFn: (vars: { id: string; input: ContentModerationInput }) =>
      api.moderateResume(vars.id, vars.input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });

  const reject = (id: string): void => {
    const reason = window.prompt('Причина отклонения резюме:');
    if (reason?.trim()) {
      moderate.mutate({ id, input: { status: 'rejected', reason: reason.trim() } });
    }
  };

  const columns: Column<ResumeDto>[] = [
    { header: 'Должность', cell: r => r.position },
    { header: 'Сфера', cell: r => (r.category ? JOB_CATEGORY_LABELS[r.category].ru : '—') },
    { header: 'Опыт', cell: r => (r.experience ? RESUME_EXPERIENCE_LABELS[r.experience] : '—') },
    { header: 'HSK', cell: r => (r.hskLevel ? `HSK ${r.hskLevel}` : '—') },
    { header: 'Рейтинг', cell: r => `★ ${Number(r.rating).toFixed(1)}` },
    { header: 'Статус', cell: r => <StatusBadge value={r.moderationStatus} labels={MODERATION_STATUS_LABELS} /> },
    {
      header: 'Действия',
      cell: r => (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={moderate.isPending}
            onClick={() => {
              moderate.mutate({ id: r.id, input: { status: 'published' } });
            }}
          >
            Опубликовать
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={moderate.isPending}
            onClick={() => {
              reject(r.id);
            }}
          >
            Отклонить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Резюме на модерации</h1>
      {isLoading ? (
        <p className="text-muted">Загрузка…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={r => r.id}
          empty="Нет резюме на модерации"
        />
      )}
    </div>
  );
}
