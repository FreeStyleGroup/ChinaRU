'use client';

import { Button } from '@china-ru/ui';
import { useTranslations } from 'next-intl';

import { AddToCart } from '@/components/add-to-cart';
import { OrderButton } from '@/components/order-button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Кнопки покупки в карточке товара.
 *
 * Гостю — одна кнопка входа: «В корзину» и «Заказать» без входа ведут на одну и
 * ту же страницу, и две кнопки с разными надписями только путали. После входа
 * покупатель возвращается на этот же товар (`?next=`), а не на главную.
 */
export function ProductActions({ productId }: { productId: string }) {
  const t = useTranslations('product');
  const { isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isHydrated && !isAuthenticated) {
    return (
      <Button
        size="lg"
        onClick={() => {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
        }}
      >
        {t('loginToBuy')}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      <AddToCart productId={productId} />
      <OrderButton productId={productId} />
    </div>
  );
}
