import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

import { AdminLayout } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import { DashboardPage } from '@/pages/dashboard';
import { LoginPage } from '@/pages/login';
import { OrdersPage } from '@/pages/orders';
import { ProductsPage } from '@/pages/products';
import { ResumesPage } from '@/pages/resumes';
import { ReviewsPage } from '@/pages/reviews';
import { SellersPage } from '@/pages/sellers';
import { UsersPage } from '@/pages/users';
import { VacanciesPage } from '@/pages/vacancies';

/** Гард: пускает только аутентифицированного администратора. */
function RequireAdmin() {
  const { isHydrated, isAdmin } = useAuth();
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">Загрузка…</div>
    );
  }
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAdmin />,
    children: [
      {
        path: '/',
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'sellers', element: <SellersPage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'reviews', element: <ReviewsPage /> },
          { path: 'resumes', element: <ResumesPage /> },
          { path: 'vacancies', element: <VacanciesPage /> },
        ],
      },
    ],
  },
]);
