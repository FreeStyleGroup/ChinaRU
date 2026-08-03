'use client';

import { Button, buttonVariants, Container } from '@china-ru/ui';
import { useTranslations } from 'next-intl';


import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

import { LocaleSwitcher } from './locale-switcher';

export function Header() {
  const t = useTranslations('nav');
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-ink">
          China<span className="text-brand">.ru</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/catalog" className="text-muted transition-colors hover:text-ink">
            {t('catalog')}
          </Link>
          <Link href="/auto" className="text-muted transition-colors hover:text-ink">
            {t('auto')}
          </Link>
          <Link href="/jobs" className="text-muted transition-colors hover:text-ink">
            {t('jobs')}
          </Link>
          <Link href="/social" className="text-muted transition-colors hover:text-ink">
            {t('social')}
          </Link>
          <Link href="/tenders" className="text-muted transition-colors hover:text-ink">
            {t('tenders')}
          </Link>
          <Link href="/horoscope" className="text-muted transition-colors hover:text-ink">
            {t('horoscope')}
          </Link>
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
                onClick={() => {
                  void logout();
                }}
              >
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted transition-colors hover:text-ink">
                {t('login')}
              </Link>
              <Link href="/register" className={buttonVariants({ size: 'sm' })}>
                {t('register')}
              </Link>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
