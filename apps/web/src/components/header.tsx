'use client';

import { Button, buttonVariants, cn, Container } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

import { LocaleSwitcher } from './locale-switcher';

/** Разделы витрины — одно перечисление для строки меню и мобильной панели. */
const NAV = [
  { href: '/catalog', key: 'catalog' },
  { href: '/auto', key: 'auto' },
  { href: '/jobs', key: 'jobs' },
  { href: '/social', key: 'social' },
  { href: '/tenders', key: 'tenders' },
  { href: '/horoscope', key: 'horoscope' },
] as const;

/**
 * Шапка. На широких экранах меню — строкой; уже `xl` (1280 px) шесть разделов
 * по-русски в строку не помещаются: на телефоне сжимались в столбики и выталкивали
 * переключатель языка за край, на 1024 px «Авто/Мото» переносился. Поэтому там
 * разделы уходят в панель под кнопкой «Меню», а вход и регистрация — туда же
 * на экранах уже `sm`.
 */
export function Header() {
  const t = useTranslations('nav');
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Переход по ссылке из панели — панель закрывается.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-ink">
          China<span className="text-brand">.ru</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm xl:flex">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted transition-colors hover:text-ink"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            aria-label={t('cart')}
            className="text-muted transition-colors hover:text-ink"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </Link>
          <LocaleSwitcher />
          {isAuthenticated ? (
            <>
              <Link
                href="/cabinet"
                className="hidden text-sm text-muted transition-colors hover:text-ink sm:inline"
              >
                {user?.name ?? t('account')}
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => {
                  void logout();
                }}
              >
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm text-muted transition-colors hover:text-ink sm:inline"
              >
                {t('login')}
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex')}
              >
                {t('register')}
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label={t('menu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => {
              setMenuOpen(open => !open);
            }}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-surface xl:hidden"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </Container>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-line bg-white xl:hidden">
          <Container className="flex flex-col py-2">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="py-3 text-base text-ink transition-colors hover:text-brand"
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-line pt-4 pb-2 sm:hidden">
              {isAuthenticated ? (
                <>
                  <Link href="/cabinet" className={buttonVariants({ size: 'sm' })}>
                    {user?.name ?? t('account')}
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void logout();
                    }}
                  >
                    {t('logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                  >
                    {t('login')}
                  </Link>
                  <Link href="/register" className={buttonVariants({ size: 'sm' })}>
                    {t('register')}
                  </Link>
                </>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
