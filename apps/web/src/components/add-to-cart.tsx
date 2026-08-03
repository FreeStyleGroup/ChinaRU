'use client';

import { Button } from '@china-ru/ui';
import { useState } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { cartClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

type State = 'idle' | 'loading' | 'done' | 'error';

export function AddToCart({ productId }: { productId: string }) {
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
      await cartClient.add(productId, 1);
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (isHydrated && !isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          router.push('/login');
        }}
      >
        Войти, чтобы купить
      </Button>
    );
  }

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
        {state === 'loading' ? 'Добавляем…' : 'В корзину'}
      </Button>
      {state === 'done' && (
        <p className="text-sm text-muted">
          Добавлено.{' '}
          <Link href="/cart" className="font-medium text-brand hover:underline">
            Перейти в корзину →
          </Link>
        </p>
      )}
      {state === 'error' && <p className="text-sm text-brand">Не удалось добавить, попробуйте ещё раз</p>}
    </div>
  );
}
