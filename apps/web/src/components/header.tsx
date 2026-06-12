'use client';

import { Button, buttonVariants, Container } from '@china-ru/ui';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from './locale-switcher';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const t = useTranslations('nav');
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-ink">
          China<span className="text-brand">-RU</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/catalog" className="text-muted transition-colors hover:text-ink">
            {t('catalog')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {isAuthenticated ? (
            <>
              <span className="hidden text-sm text-muted sm:inline">
                {user?.name ?? user?.email}
              </span>
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
