'use client';

import { Button } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { orderClient } from '@/lib/api-client';

type State = 'idle' | 'loading' | 'done' | 'error';

/** Заказ одной позиции в один клик для вошедшего покупателя. Гостю — вход (ProductActions). */
export function OrderButton({ productId }: { productId: string }) {
  const t = useTranslations('product');
  const [state, setState] = useState<State>('idle');

  const onClick = async (): Promise<void> => {
    setState('loading');
    try {
      await orderClient.create({ items: [{ productId, qty: 1 }] });
      setState('done');
    } catch {
      setState('error');
    }
  };

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
      {state === 'error' && <p className="text-sm text-brand">{t('orderFailed')}</p>}
    </div>
  );
}
