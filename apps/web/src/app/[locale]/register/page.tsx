'use client';

import { LEGAL_DOCS } from '@china-ru/shared';
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
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (): Promise<void> => {
    if (!consent) return;
    setLoading(true);
    setError(false);
    try {
      await register({
        email,
        password,
        pdConsent: true,
        ...(name ? { name } : {}),
        ...(ref ? { ref } : {}),
      });
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
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={e => {
                setConsent(e.target.checked);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
            />
            <span>
              {t.rich('consent', {
                consent: chunks => (
                  <a
                    href={LEGAL_DOCS.pdConsent}
                    target="_blank"
                    rel="noopener"
                    className="text-brand underline"
                  >
                    {chunks}
                  </a>
                ),
                policy: chunks => (
                  <a
                    href={LEGAL_DOCS.privacyPolicy}
                    target="_blank"
                    rel="noopener"
                    className="text-brand underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </label>
          {error && <p className="text-sm text-brand">{t('error')}</p>}
          <Button type="submit" className="w-full" disabled={loading || !consent}>
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
