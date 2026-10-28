import { ORDER_STATUS_LABELS } from '@china-ru/shared';
import { useQuery } from '@tanstack/react-query';


import { DataTable, type Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

import type { OrderDto } from '@china-ru/shared';

const columns: Column<OrderDto>[] = [
  { header: 'ID', cell: o => <span className="font-mono text-xs">{o.id.slice(0, 8)}</span> },
  { header: 'Статус', cell: o => <StatusBadge value={o.status} labels={ORDER_STATUS_LABELS} /> },
  { header: 'Сумма', cell: o => formatMoney(o.totalAmount, o.currency) },
  { header: 'Позиций', cell: o => o.items.length },
  { header: 'Создан', cell: o => formatDate(o.createdAt) },
];

export function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.orders({ pageSize: 50 }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Заказы</h1>
      {isLoading ? (
        <p className="text-muted">Загрузка…</p>
      ) : (
        <DataTable columns={columns} rows={data?.items ?? []} rowKey={o => o.id} />
      )}
    </div>
  );
}
