'use client';

import { Button } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { authClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

/**
 * Напоминание в кабинете, пока адрес почты не подтверждён, с повторной
 * отправкой письма: первое могло не дойти или ссылка в нём истекла (24 часа).
 */
export function EmailVerifyNotice() {
  const t = useTranslations('auth');
  const { user, setUser } = useAuth();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!user || user.emailVerified) return null;

  const resend = async (): Promise<void> => {
    setStatus('sending');
    try {
      const { alreadyVerified } = await authClient.resendVerification();
      if (alreadyVerified) {
        setUser({ ...user, emailVerified: true });
        return;
      }
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-ink">{t('verifyNoticeTitle')}</p>
        <p className="text-sm break-words text-muted">
          {t('verifyNoticeText', { email: user.email })}
        </p>
        {status === 'sent' && (
          <p className="text-sm text-ink" role="status">
            {t('verifyNoticeSent')}
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-brand" role="alert">
            {t('error')}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        disabled={status === 'sending' || status === 'sent'}
        onClick={() => {
          void resend();
        }}
      >
        {t('verifyNoticeResend')}
      </Button>
    </div>
  );
}
