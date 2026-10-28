import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '@china-ru/shared';
import { useQuery } from '@tanstack/react-query';


import { DataTable, type Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

import type { UserDto } from '@china-ru/shared';

const columns: Column<UserDto>[] = [
  { header: 'Email', cell: u => u.email },
  { header: 'Имя', cell: u => u.name ?? '—' },
  { header: 'Роль', cell: u => <StatusBadge value={u.role} labels={USER_ROLE_LABELS} /> },
  { header: 'Статус', cell: u => <StatusBadge value={u.status} labels={USER_STATUS_LABELS} /> },
  { header: 'Регистрация', cell: u => formatDate(u.createdAt) },
];

export function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users({ pageSize: 50 }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Пользователи</h1>
      {isLoading ? (
        <p className="text-muted">Загрузка…</p>
      ) : (
        <DataTable columns={columns} rows={data?.items ?? []} rowKey={u => u.id} />
      )}
    </div>
  );
}
