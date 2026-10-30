'use client';

import { Button, Container } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { authClient, ClientApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { dropTokenFromLocation, tokenErrorKey, tokenFromLocation } from '@/lib/url-token';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'ready'; token: string }
  | { kind: 'sending'; token: string }
  | { kind: 'done' }
  | { kind: 'failed'; message: 'tokenExpired' | 'tokenInvalid' | 'error' };

/**
 * Подтверждение адреса по ссылке из письма. Подтверждает кнопка, а не сам
 * переход: почтовые фильтры открывают ссылки из писем для проверки, и
 * подтверждение «на открытие» срабатывало бы без участия человека.
 */
export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const { user, setUser } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const token = tokenFromLocation();
    setState(token ? { kind: 'ready', token } : { kind: 'missing' });
  }, []);

  const confirm = async (token: string): Promise<void> => {
    setState({ kind: 'sending', token });
    try {
      await authClient.verifyEmail(token);
      dropTokenFromLocation();
      if (user) setUser({ ...user, emailVerified: true });
      setState({ kind: 'done' });
    } catch (error) {
      setState({
        kind: 'failed',
        message: error instanceof ClientApiError ? tokenErrorKey(error.code) : 'error',
      });
    }
  };

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-ink">{t('verifyTitle')}</h1>

        {(state.kind === 'ready' || state.kind === 'sending') && (
          <>
            <p className="text-muted">{t('verifyLead')}</p>
            <Button
              className="w-full"
              disabled={state.kind === 'sending'}
              onClick={() => {
                void confirm(state.token);
              }}
            >
              {t('verifySubmit')}
            </Button>
          </>
        )}

        {state.kind === 'done' && (
          <>
            <p className="text-ink" role="status">
              {t('verifyDone')}
            </p>
            <Link href={user ? '/cabinet/profile' : '/login'} className="font-medium text-brand">
              {user ? t('toCabinet') : t('toLogin')}
            </Link>
          </>
        )}

        {(state.kind === 'missing' || state.kind === 'failed') && (
          <div className="space-y-3" role="alert">
            <p className="text-brand">
              {t(state.kind === 'missing' ? 'tokenMissing' : state.message)}
            </p>
            <p className="text-sm text-muted">{t('verifyResendHint')}</p>
            <Link href={user ? '/cabinet/profile' : '/login'} className="font-medium text-brand">
              {user ? t('toCabinet') : t('toLogin')}
            </Link>
          </div>
        )}
      </div>
    </Container>
  );
}
