import { Button } from '@china-ru/ui';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '@/lib/auth';

const NAV = [
  { to: '/', label: 'Дашборд', end: true },
  { to: '/users', label: 'Пользователи', end: false },
  { to: '/sellers', label: 'Продавцы', end: false },
  { to: '/products', label: 'Товары', end: false },
  { to: '/orders', label: 'Заказы', end: false },
  { to: '/reviews', label: 'Отзывы', end: false },
  { to: '/resumes', label: 'Резюме', end: false },
  { to: '/vacancies', label: 'Вакансии', end: false },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-surface text-ink">
      <aside className="flex w-60 flex-col border-r border-line bg-white">
        <div className="border-b border-line px-5 py-4 text-lg font-bold">
          China<span className="text-brand">.ru</span>
          <span className="ml-1 text-xs font-normal text-muted">admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'bg-brand/10 font-medium text-brand' : 'text-muted hover:bg-surface'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line p-3 text-sm">
          <p className="truncate text-muted">{user?.email}</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              void logout().then(() => {
                void navigate('/login');
              });
            }}
          >
            Выйти
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
