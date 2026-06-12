'use client';

import { Button, Container } from '@china-ru/ui';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useState } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

/** Обёртка с Suspense — `useSearchParams` требует границы при статической генерации. */
export default function RegisterPage() {
  return (
    <Suspense fallback={<Container className="py-16" />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const t = useTranslations('auth');
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref');
  const ref = refParam && /^\d+$/.test(refParam) ? Number(refParam) : undefined;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      await register({ email, password, ...(name ? { name } : {}), ...(ref ? { ref } : {}) });
      router.push('/');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-ink">{t('registerTitle')}</h1>
        {ref && (
          <p className="rounded-lg bg-brand/5 px-3 py-2 text-sm text-brand">
            Регистрация по приглашению партнёра #{ref}
          </p>
        )}
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">{t('name')}</span>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">{t('email')}</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => {
                setEmail(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">{t('password')}</span>
            <input
              type="password"
              required
              value={password}
              onChange={e => {
                setPassword(e.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          {error && <p className="text-sm text-brand">{t('error')}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {t('submitRegister')}
          </Button>
        </form>
        <p className="text-center text-sm text-muted">
          {t('haveAccount')}{' '}
          <Link href="/login" className="font-medium text-brand">
            {t('loginTitle')}
          </Link>
        </p>
      </div>
    </Container>
  );
}
