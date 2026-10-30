'use client';

import { Button } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';
import { cartClient, ClientApiError } from '@/lib/api-client';

type State = 'idle' | 'loading' | 'done' | 'error' | 'onRequest';

/** «В корзину» для вошедшего покупателя. Гостю вместо неё — вход (ProductActions). */
export function AddToCart({ productId }: { productId: string }) {
  const t = useTranslations('product');
  const [state, setState] = useState<State>('idle');

  const onClick = async (): Promise<void> => {
    setState('loading');
    try {
      await cartClient.add(productId, 1);
      setState('done');
    } catch (e) {
      // Страница из кеша, а продавец уже убрал цену («цена по запросу») — API отвечает 409.
      setState(
        e instanceof ClientApiError && e.code === 'price_on_request' ? 'onRequest' : 'error'
      );
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="lg"
        disabled={state === 'loading'}
        onClick={() => {
          void onClick();
        }}
      >
        {state === 'loading' ? t('addingToCart') : t('addToCart')}
      </Button>
      {state === 'done' && (
        <p className="text-sm text-muted">
          {t('addedToCart')}{' '}
          <Link href="/cart" className="font-medium text-brand hover:underline">
            {t('goToCart')}
          </Link>
        </p>
      )}
      {state === 'error' && <p className="text-sm text-brand">{t('addToCartFailed')}</p>}
      {state === 'onRequest' && <p className="text-sm text-brand">{t('priceOnRequestNow')}</p>}
    </div>
  );
}
