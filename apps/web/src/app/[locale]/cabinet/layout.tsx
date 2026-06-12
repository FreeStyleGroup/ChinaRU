'use client';

import { CABINET_SECTIONS } from '@china-ru/shared';
import { Container } from '@china-ru/ui';
import { useEffect, useState, type ReactNode } from 'react';

import { CabinetMenuModal } from '@/components/cabinet/menu-modal';
import { NavIcon } from '@/components/cabinet/nav-icon';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

export default function CabinetLayout({ children }: { children: ReactNode }) {
  const { user, isHydrated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isHydrated && !user) void router.replace('/login');
  }, [isHydrated, user, router]);

  if (!isHydrated || !user) {
    return (
      <Container className="py-20 text-center text-muted">Загрузка личного кабинета…</Container>
    );
  }

  const enabled = new Set(user.menuSections);
  const visible = CABINET_SECTIONS.filter(s => s.pinned || enabled.has(s.key));

  return (
    <Container className="py-8">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center gap-3 border-b border-line px-2 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
              {(user.name ?? user.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name ?? 'Профиль'}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>

          <nav className="mt-3 space-y-0.5">
            {visible.map(s => {
              const href = `/cabinet/${s.key}`;
              const active = pathname === href;
              return (
                <Link
                  key={s.key}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-brand/10 font-medium text-brand' : 'text-muted hover:bg-surface'
                  }`}
                >
                  <NavIcon section={s.key} />
                  {s.titleRu}
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 space-y-1 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-surface"
            >
              <span className="text-base leading-none">+</span> Настроить меню
            </button>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => router.replace('/login'));
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface"
            >
              <NavIcon section="logout" /> Выход
            </button>
          </div>
        </aside>

        <section>{children}</section>
      </div>

      {menuOpen && (
        <CabinetMenuModal
          onClose={() => {
            setMenuOpen(false);
          }}
        />
      )}
    </Container>
  );
}
