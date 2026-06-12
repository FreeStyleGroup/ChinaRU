import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['stats'], queryFn: () => api.stats() });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Дашборд</h1>
      {isLoading || !data ? (
        <p className="text-muted">Загрузка…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Пользователи" value={data.users} />
          <StatCard label="Товары" value={data.products} />
          <StatCard label="Заказы" value={data.orders} />
          <StatCard label="Продавцы на проверке" value={data.pendingSellers} />
          <StatCard label="Отзывы на модерации" value={data.pendingReviews} />
          <StatCard label="Оборот (GMV)" value={`${data.gmv} ₽`} />
        </div>
      )}
    </div>
  );
}
