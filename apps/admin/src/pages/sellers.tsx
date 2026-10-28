import { SELLER_VERIFY_STATUS_LABELS } from '@china-ru/shared';
import { Button, StatusBadge } from '@china-ru/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';


import { DataTable, type Column } from '@/components/data-table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

import type { SellerProfileDto, SellerVerifyDecisionInput } from '@china-ru/shared';

export function SellersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => api.sellers({ pageSize: 50 }),
  });

  const verify = useMutation({
    mutationFn: (vars: { id: string; decision: SellerVerifyDecisionInput }) =>
      api.verifySeller(vars.id, vars.decision),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sellers'] });
    },
  });

  const columns: Column<SellerProfileDto>[] = [
    { header: 'Компания', cell: s => s.companyName },
    { header: 'ИНН', cell: s => s.inn ?? '—' },
    { header: 'Статус', cell: s => <StatusBadge value={s.verifyStatus} labels={SELLER_VERIFY_STATUS_LABELS} /> },
    { header: 'Создан', cell: s => formatDate(s.createdAt) },
    {
      header: 'Действия',
      cell: s =>
        s.verifyStatus === 'pending' || s.verifyStatus === 'unverified' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={verify.isPending}
              onClick={() => {
                verify.mutate({ id: s.id, decision: { status: 'verified' } });
              }}
            >
              Одобрить
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={verify.isPending}
              onClick={() => {
                verify.mutate({ id: s.id, decision: { status: 'rejected' } });
              }}
            >
              Отклонить
            </Button>
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Продавцы</h1>
      {isLoading ? (
        <p className="text-muted">Загрузка…</p>
      ) : (
        <DataTable columns={columns} rows={data?.items ?? []} rowKey={s => s.id} />
      )}
    </div>
  );
}
