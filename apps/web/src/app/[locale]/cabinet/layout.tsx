'use client';

import { CABINET_SECTIONS } from '@china-ru/shared';
import { Container } from '@china-ru/ui';
import { useEffect, useState, type ReactNode } from 'react';


import { CabinetMenuModal } from '@/components/cabinet/menu-modal';
import { NavIcon } from '@/components/cabinet/nav-icon';
import { isStoreVerified, SellerContext } from '@/components/cabinet/seller-context';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { accountClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

import type { CabinetSection, SellerProfileDto } from '@china-ru/shared';

export default function CabinetLayout({ children }: { children: ReactNode }) {
  const { user, isHydrated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [seller, setSeller] = useState<SellerProfileDto | null>(null);
  const [sellerLoading, setSellerLoading] = useState(true);

  useEffect(() => {
    if (isHydrated && !user) void router.replace('/login');
  }, [isHydrated, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void accountClient
      .getSeller()
      .then(p => {
        if (!cancelled) setSeller(p);
      })
      .catch(() => {
        if (!cancelled) setSeller(null);
      })
      .finally(() => {
        if (!cancelled) setSellerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!isHydrated || !user) {
    return (
      <Container className="py-20 text-center text-muted">Загрузка личного кабинета…</Container>
    );
  }

  const enabled = new Set(user.menuSections);
  const visible: readonly CabinetSection[] = CABINET_SECTIONS.filter(
    s => s.pinned || enabled.has(s.key)
  );
  const storeVerified = isStoreVerified(seller);

  // «Мой магазин» появляется только после верификации; иначе пункт зовёт начать торговать.
  const labelFor = (key: string, fallback: string): string =>
    key === 'store' ? (storeVerified ? 'Мой магазин' : 'Начать торговать') : fallback;

  let prevGroup = '';

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
              const childActive = pathname.startsWith(`${href}/`);
              const expanded = active || childActive;
              const showSeparator = prevGroup !== '' && prevGroup !== s.group;
              prevGroup = s.group;

              return (
                <div key={s.key}>
                  {showSeparator && <div className="my-2 border-t border-line" />}
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active ? 'bg-brand/10 font-medium text-brand' : 'text-muted hover:bg-surface'
                    }`}
                  >
                    <NavIcon section={s.key} />
                    <span className="flex-1">{labelFor(s.key, s.titleRu)}</span>
                    {s.key === 'store' && storeVerified && (
                      <span className="text-brand" title="Магазин верифицирован">
                        ✓
                      </span>
                    )}
                    {s.subitems && (
                      <span
                        className={`text-[10px] transition-transform ${expanded ? 'text-brand' : 'rotate-[-90deg] text-muted'}`}
                      >
                        ▼
                      </span>
                    )}
                  </Link>

                  {s.subitems && expanded && (
                    <div className="mt-0.5 space-y-0.5 pl-11">
                      {s.subitems.map(sub => {
                        const subHref = `${href}/${sub.key}`;
                        const subActive = pathname === subHref;
                        return (
                          <Link
                            key={sub.key}
                            href={subHref}
                            className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                              subActive ? 'font-medium text-brand' : 'text-muted hover:text-ink'
                            }`}
                          >
                            {sub.titleRu}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
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

        <section>
          <SellerContext.Provider
            value={{ profile: seller, loading: sellerLoading, setProfile: setSeller }}
          >
            {children}
          </SellerContext.Provider>
        </section>
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
