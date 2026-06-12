import { Badge, Button } from '@china-ru/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';


import { DataTable, type Column } from '@/components/data-table';
import { api } from '@/lib/api';

import type { ReviewDto, ReviewModerationInput } from '@china-ru/shared';

export function ReviewsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => api.reviews({ status: 'pending', pageSize: 50 }),
  });

  const moderate = useMutation({
    mutationFn: (vars: { id: string; input: ReviewModerationInput }) =>
      api.moderateReview(vars.id, vars.input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  const columns: Column<ReviewDto>[] = [
    { header: 'Автор', cell: r => r.author.name ?? '—' },
    { header: 'Оценка', cell: r => `★ ${r.rating}` },
    { header: 'Отзыв', cell: r => <span className="line-clamp-2 max-w-md">{r.body}</span> },
    { header: 'Статус', cell: r => <Badge>{r.status}</Badge> },
    {
      header: 'Действия',
      cell: r => (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={moderate.isPending}
            onClick={() => {
              moderate.mutate({ id: r.id, input: { status: 'approved' } });
            }}
          >
            Одобрить
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={moderate.isPending}
            onClick={() => {
              moderate.mutate({ id: r.id, input: { status: 'rejected' } });
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
      <h1 className="text-2xl font-bold text-ink">Отзывы на модерации</h1>
      {isLoading ? (
        <p className="text-muted">Загрузка…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={r => r.id}
          empty="Нет отзывов на модерации"
        />
      )}
    </div>
  );
}
