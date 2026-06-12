'use client';

import { Button } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import { orderClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

type State = 'idle' | 'loading' | 'done' | 'error';

export function OrderButton({ productId }: { productId: string }) {
  const t = useTranslations('product');
  const { isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<State>('idle');

  const onClick = async (): Promise<void> => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setState('loading');
    try {
      await orderClient.create({ items: [{ productId, qty: 1 }] });
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (isHydrated && !isAuthenticated) {
    return (
      <Button
        variant="outline"
        onClick={() => {
          router.push('/login');
        }}
      >
        {t('loginToOrder')}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        disabled={state === 'loading' || state === 'done'}
        onClick={() => {
          void onClick();
        }}
      >
        {state === 'done' ? t('ordered') : t('order')}
      </Button>
      {state === 'error' && <p className="text-sm text-brand">{t('loginToOrder')}</p>}
    </div>
  );
}
