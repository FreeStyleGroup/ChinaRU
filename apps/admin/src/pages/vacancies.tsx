import { JOB_CATEGORY_LABELS, MODERATION_STATUS_LABELS } from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';


import { DataTable, type Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';

import type { ContentModerationInput, JobListingDto } from '@china-ru/shared';

export function VacanciesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => api.vacancies({ status: 'pending', pageSize: 50 }),
  });

  const moderate = useMutation({
    mutationFn: (vars: { id: string; input: ContentModerationInput }) =>
      api.moderateVacancy(vars.id, vars.input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vacancies'] });
    },
  });

  const reject = (id: string): void => {
    const reason = window.prompt('Причина отклонения вакансии:');
    if (reason?.trim()) {
      moderate.mutate({ id, input: { status: 'rejected', reason: reason.trim() } });
    }
  };

  const columns: Column<JobListingDto>[] = [
    { header: 'Вакансия', cell: v => v.title },
    { header: 'Категория', cell: v => (v.category ? JOB_CATEGORY_LABELS[v.category].ru : '—') },
    { header: 'Город', cell: v => v.city ?? '—' },
    { header: 'Тип', cell: v => v.workType },
    { header: 'Статус', cell: v => <StatusBadge value={v.moderationStatus} labels={MODERATION_STATUS_LABELS} /> },
    {
      header: 'Действия',
      cell: v => (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={moderate.isPending}
            onClick={() => {
              moderate.mutate({ id: v.id, input: { status: 'published' } });
            }}
          >
            Опубликовать
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={moderate.isPending}
            onClick={() => {
              reject(v.id);
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
      <h1 className="text-2xl font-bold text-ink">Вакансии на модерации</h1>
      {isLoading ? (
        <p className="text-muted">Загрузка…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={v => v.id}
          empty="Нет вакансий на модерации"
        />
      )}
    </div>
  );
}
