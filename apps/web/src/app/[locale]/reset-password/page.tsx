'use client';

import { passwordSchema } from '@china-ru/shared';
import { Button, Container } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { authClient, ClientApiError } from '@/lib/api-client';
import { dropTokenFromLocation, tokenErrorKey, tokenFromLocation } from '@/lib/url-token';

type Problem = 'passwordMismatch' | 'passwordRules' | 'tokenExpired' | 'tokenInvalid' | 'error';

/** Новый пароль по ссылке из письма. Смена пароля завершает все сеансы. */
export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(tokenFromLocation());
  }, []);

  const submit = async (resetToken: string): Promise<void> => {
    if (password !== repeat) {
      setProblem('passwordMismatch');
      return;
    }
    // Те же правила, что на сервере (общая схема), — подсказка до отправки.
    if (!passwordSchema.safeParse(password).success) {
      setProblem('passwordRules');
      return;
    }
    setLoading(true);
    setProblem(null);
    try {
      await authClient.resetPassword(resetToken, password);
      dropTokenFromLocation();
      setDone(true);
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 422) setProblem('passwordRules');
      else setProblem(error instanceof ClientApiError ? tokenErrorKey(error.code) : 'error');
    } finally {
      setLoading(false);
    }
  };

  const linkDead = problem === 'tokenExpired' || problem === 'tokenInvalid';

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-ink">{t('resetTitle')}</h1>

        {done && (
          <div className="space-y-3" role="status">
            <p className="text-ink">{t('resetDone')}</p>
            <Link href="/login" className="font-medium text-brand">
              {t('toLogin')}
            </Link>
          </div>
        )}

        {token === null && (
          <div className="space-y-3" role="alert">
            <p className="text-brand">{t('tokenMissing')}</p>
            <Link href="/forgot-password" className="font-medium text-brand">
              {t('requestNewLink')}
            </Link>
          </div>
        )}

        {typeof token === 'string' && !done && (
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              void submit(token);
            }}
          >
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">{t('newPassword')}</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                }}
                className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
              />
              <span className="block text-xs text-muted">{t('passwordRules')}</span>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">{t('repeatPassword')}</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={repeat}
                onChange={e => {
                  setRepeat(e.target.value);
                }}
                className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
              />
            </label>
            {problem && (
              <div className="space-y-2" role="alert">
                <p className="text-sm text-brand">{t(problem)}</p>
                {linkDead && (
                  <Link href="/forgot-password" className="text-sm font-medium text-brand">
                    {t('requestNewLink')}
                  </Link>
                )}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading || linkDead}>
              {t('resetSubmit')}
            </Button>
          </form>
        )}
      </div>
    </Container>
  );
}
