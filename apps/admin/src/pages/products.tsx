import { PRODUCT_STATUS_LABELS } from '@china-ru/shared';
import { StatusBadge } from '@china-ru/ui';
import { useQuery } from '@tanstack/react-query';

import { DataTable, type Column } from '@/components/data-table';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';

import type { ProductDto } from '@china-ru/shared';

const columns: Column<ProductDto>[] = [
  { header: 'Название', cell: p => p.nameRu },
  { header: 'Артикул', cell: p => p.sku },
  // null — «цена по запросу»: покупатели присылают продавцу запрос цены.
  {
    header: 'Цена',
    cell: p =>
      p.price === null ? (
        <span className="text-muted">по запросу</span>
      ) : (
        formatMoney(p.price, p.currency)
      ),
  },
  { header: 'Остаток', cell: p => p.stock },
  { header: 'Статус', cell: p => <StatusBadge value={p.status} labels={PRODUCT_STATUS_LABELS} /> },
];

export function ProductsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products({ pageSize: 50 }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Товары</h1>
      {isLoading ? (
        <p className="text-muted">Загрузка…</p>
      ) : (
        <DataTable columns={columns} rows={data?.items ?? []} rowKey={p => p.id} />
      )}
    </div>
  );
}
