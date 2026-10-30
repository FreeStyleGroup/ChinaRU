'use client';

import { Button, Container } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';
import { authClient } from '@/lib/api-client';

/**
 * Запрос ссылки для смены пароля. Ответ одинаковый для зарегистрированного
 * и незнакомого адреса: страница не подсказывает, кто зарегистрирован.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      await authClient.requestPasswordReset(email);
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-ink">{t('forgotTitle')}</h1>

        {sent ? (
          <p className="text-ink" role="status">
            {t('forgotSent')}
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              void submit();
            }}
          >
            <p className="text-sm text-muted">{t('forgotLead')}</p>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">{t('email')}</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                }}
                className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
              />
            </label>
            {error && (
              <p className="text-sm text-brand" role="alert">
                {t('error')}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {t('forgotSubmit')}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-brand">
            {t('toLogin')}
          </Link>
        </p>
      </div>
    </Container>
  );
}
