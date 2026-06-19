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
          <Link href="/jobs" className="text-muted transition-colors hover:text-ink">
            {t('jobs')}
          </Link>
          <Link href="/social" className="text-muted transition-colors hover:text-ink">
            {t('social')}
          </Link>
          <Link href="/horoscope" className="text-muted transition-colors hover:text-ink">
            {t('horoscope')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
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
