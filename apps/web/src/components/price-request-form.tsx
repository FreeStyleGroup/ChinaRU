'use client';

import { Button } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { ClientApiError, priceRequestClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

/** Те же границы, что у `createPriceRequestSchema` в @china-ru/shared — ошибка видна до отправки. */
const QTY_MAX = 1_000_000;
const COMMENT_MAX = 2000;
const PHONE_RE = /^\+?[0-9 ()-]{6,20}$/;

type Outcome = { kind: 'sent'; withPhone: boolean } | { kind: 'exists' };

const inputCls =
  'h-11 w-full rounded-lg border border-line bg-white px-3 outline-none focus:border-brand';

/**
 * «Запросить цену» у товара без цены (B2B: цена зависит от объёма и комплектации).
 * Гостю — вход с возвратом на этот товар (как у ProductActions). Ответ продавец
 * отправляет на e-mail учётной записи покупателя или звонит по указанному телефону.
 */
export function PriceRequestForm({ productId }: { productId: string }) {
  const t = useTranslations('priceRequest');
  const { isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [qty, setQty] = useState('1');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ message: string; relogin?: boolean } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  if (isHydrated && !isAuthenticated) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">{t('loginHint')}</p>
        <Button
          size="lg"
          onClick={() => {
            router.push(loginHref);
          }}
        >
          {t('login')}
        </Button>
      </div>
    );
  }

  if (outcome) {
    return (
      <div
        role="status"
        className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
      >
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l2.7 2.7L16 9.8" />
        </svg>
        <div>
          {outcome.kind === 'sent' ? (
            <>
              <p className="font-semibold">{t('sentTitle')}</p>
              <p className="mt-1">{t('sent', { phone: outcome.withPhone ? 'yes' : 'no' })}</p>
            </>
          ) : (
            <p>{t('errorExists')}</p>
          )}
        </div>
      </div>
    );
  }

  const qtyNumber = Number(qty);
  const qtyValid = Number.isInteger(qtyNumber) && qtyNumber >= 1 && qtyNumber <= QTY_MAX;
  const phoneValue = phone.trim();
  const phoneValid = phoneValue === '' || PHONE_RE.test(phoneValue);

  const submit = async (): Promise<void> => {
    setError(null);
    setFieldErrors({});
    if (!qtyValid || !phoneValid) {
      setFieldErrors({
        ...(qtyValid ? {} : { qty: t('invalidQty') }),
        ...(phoneValid ? {} : { contactPhone: t('invalidPhone') }),
      });
      return;
    }
    setSending(true);
    try {
      const commentValue = comment.trim();
      await priceRequestClient.create(productId, {
        qty: qtyNumber,
        ...(commentValue ? { comment: commentValue } : {}),
        ...(phoneValue ? { contactPhone: phoneValue } : {}),
      });
      setOutcome({ kind: 'sent', withPhone: phoneValue !== '' });
    } catch (e) {
      if (!(e instanceof ClientApiError)) {
        setError({ message: t('errorGeneric') });
      } else if (e.code === 'price_request_exists') {
        setOutcome({ kind: 'exists' });
      } else if (e.status === 401) {
        setError({ message: t('errorAuth'), relogin: true });
      } else if (e.code === 'price_set') {
        setError({ message: t('errorPriceSet') });
      } else if (e.code === 'own_product') {
        setError({ message: t('errorOwn') });
      } else if (e.code === 'product_not_found') {
        setError({ message: t('errorNotFound') });
      } else if (e.fields && Object.keys(e.fields).length > 0) {
        setFieldErrors(e.fields);
      } else {
        setError({ message: t('errorGeneric') });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={e => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">{t('qty')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={QTY_MAX}
            step={1}
            required
            value={qty}
            onChange={e => {
              setQty(e.target.value);
            }}
            aria-invalid={fieldErrors.qty ? true : undefined}
            aria-describedby={fieldErrors.qty ? 'pr-qty-error' : undefined}
            className={inputCls}
          />
          {fieldErrors.qty && (
            <span id="pr-qty-error" className="block text-xs text-brand">
              {fieldErrors.qty}
            </span>
          )}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">
            {t('phone')} <span className="font-normal text-muted">· {t('optional')}</span>
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            value={phone}
            onChange={e => {
              setPhone(e.target.value);
            }}
            placeholder="+7 900 000-00-00"
            aria-invalid={fieldErrors.contactPhone ? true : undefined}
            aria-describedby="pr-phone-hint"
            className={inputCls}
          />
          <span
            id="pr-phone-hint"
            className={`block text-xs ${fieldErrors.contactPhone ? 'text-brand' : 'text-muted'}`}
          >
            {fieldErrors.contactPhone ?? t('phoneHint')}
          </span>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">
          {t('comment')} <span className="font-normal text-muted">· {t('optional')}</span>
        </span>
        <textarea
          rows={3}
          maxLength={COMMENT_MAX}
          value={comment}
          onChange={e => {
            setComment(e.target.value);
          }}
          placeholder={t('commentPlaceholder')}
          aria-invalid={fieldErrors.comment ? true : undefined}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
        />
        {fieldErrors.comment && (
          <span className="block text-xs text-brand">{fieldErrors.comment}</span>
        )}
      </label>

      {error && (
        <p role="alert" className="text-sm text-brand">
          {error.message}{' '}
          {error.relogin && (
            <Link href={loginHref} className="font-medium underline">
              {t('login')}
            </Link>
          )}
        </p>
      )}

      <Button type="submit" size="lg" disabled={sending || !isHydrated}>
        {sending ? t('sending') : t('submit')}
      </Button>
    </form>
  );
}
