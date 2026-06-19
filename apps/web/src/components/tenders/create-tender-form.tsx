'use client';

import {
  CURRENCIES,
  TENDER_LAWS,
  TENDER_LAW_LABELS,
  TENDER_METHODS,
  TENDER_METHOD_LABELS,
  type CreateTenderInput,
  type Currency,
  type TenderLaw,
  type TenderMethod,
} from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { accountClient, ClientApiError, tenderClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

const CURRENCY_LABEL: Record<Currency, string> = {
  rub: '₽ рубль',
  cny: '¥ юань',
  usd: '$ доллар',
  eur: '€ евро',
};

const inputCls =
  'w-full rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand';

/** Форма размещения тендера (только верифицированная компания-заказчик). */
export function CreateTenderForm() {
  const { user, isHydrated } = useAuth();
  const router = useRouter();
  const [canPost, setCanPost] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    method: 'open_tender' as TenderMethod,
    law: 'commercial' as TenderLaw,
    region: '',
    deliveryPlace: '',
    startPrice: '',
    currency: 'rub' as Currency,
    bidSecurity: '',
    contractSecurity: '',
    submissionDeadline: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated || !user) return;
    void accountClient
      .getSeller()
      .then(s => {
        setCanPost(s !== null && s.verifyStatus === 'verified');
      })
      .catch(() => {
        setCanPost(false);
      });
  }, [user, isHydrated]);

  if (isHydrated && !user) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Войдите
        </Link>{' '}
        как компания, чтобы размещать тендеры.
      </p>
    );
  }
  if (canPost === false) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        Размещать тендеры могут только верифицированные компании.{' '}
        <Link href="/cabinet/store" className="font-medium text-brand hover:underline">
          Подать заявку на верификацию →
        </Link>
      </p>
    );
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]): void => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      const input: CreateTenderInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        method: form.method,
        law: form.law,
        currency: form.currency,
        submissionDeadline: new Date(form.submissionDeadline).toISOString(),
        ...(form.region.trim() ? { region: form.region.trim() } : {}),
        ...(form.deliveryPlace.trim() ? { deliveryPlace: form.deliveryPlace.trim() } : {}),
        ...(form.startPrice.trim() ? { startPrice: form.startPrice.trim() } : {}),
        ...(form.bidSecurity.trim() ? { bidSecurity: form.bidSecurity.trim() } : {}),
        ...(form.contractSecurity.trim() ? { contractSecurity: form.contractSecurity.trim() } : {}),
      };
      const created = await tenderClient.create(input);
      router.push(`/tenders/${created.id}`);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : 'Не удалось создать тендер');
    } finally {
      setBusy(false);
    }
  };

  const valid =
    form.title.trim().length >= 5 &&
    form.description.trim().length >= 10 &&
    form.submissionDeadline.length > 0;

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-white p-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <label className="block">
        <span className="text-xs text-muted">Название тендера</span>
        <input
          value={form.title}
          onChange={e => {
            set('title', e.target.value);
          }}
          placeholder="Напр. Поставка холодильного оборудования"
          className={`mt-1 ${inputCls}`}
        />
      </label>

      <label className="block">
        <span className="text-xs text-muted">Предмет закупки и требования</span>
        <textarea
          rows={6}
          value={form.description}
          maxLength={10000}
          onChange={e => {
            set('description', e.target.value);
          }}
          placeholder="Опишите предмет закупки, объём, требования к участникам и условия. Без ссылок на сторонние сайты."
          className={`mt-1 resize-none ${inputCls}`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-muted">Способ проведения</span>
          <select
            value={form.method}
            onChange={e => {
              set('method', e.target.value as TenderMethod);
            }}
            className={`mt-1 ${inputCls}`}
          >
            {TENDER_METHODS.map(m => (
              <option key={m} value={m}>
                {TENDER_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-muted">Правовой режим</span>
          <select
            value={form.law}
            onChange={e => {
              set('law', e.target.value as TenderLaw);
            }}
            className={`mt-1 ${inputCls}`}
          >
            {TENDER_LAWS.map(l => (
              <option key={l} value={l}>
                {TENDER_LAW_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-muted">Регион</span>
          <input
            value={form.region}
            onChange={e => {
              set('region', e.target.value);
            }}
            placeholder="Москва"
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Место поставки</span>
          <input
            value={form.deliveryPlace}
            onChange={e => {
              set('deliveryPlace', e.target.value);
            }}
            placeholder="Склад заказчика, г. Москва"
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">НМЦК (начальная цена)</span>
          <input
            value={form.startPrice}
            inputMode="decimal"
            onChange={e => {
              set('startPrice', e.target.value);
            }}
            placeholder="5000000.00"
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Валюта</span>
          <select
            value={form.currency}
            onChange={e => {
              set('currency', e.target.value as Currency);
            }}
            className={`mt-1 ${inputCls}`}
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>
                {CURRENCY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-muted">Обеспечение заявки</span>
          <input
            value={form.bidSecurity}
            inputMode="decimal"
            onChange={e => {
              set('bidSecurity', e.target.value);
            }}
            placeholder="необязательно"
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Обеспечение контракта</span>
          <input
            value={form.contractSecurity}
            inputMode="decimal"
            onChange={e => {
              set('contractSecurity', e.target.value);
            }}
            placeholder="необязательно"
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Срок окончания приёма заявок</span>
          <input
            type="datetime-local"
            value={form.submissionDeadline}
            onChange={e => {
              set('submissionDeadline', e.target.value);
            }}
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>

      <p className="text-xs text-muted">
        Тендер сохранится как черновик — вы сможете проверить его и опубликовать на странице тендера.
      </p>
      <Button
        disabled={busy || !valid}
        onClick={() => {
          void submit();
        }}
      >
        {busy ? 'Создание…' : 'Создать черновик'}
      </Button>
    </div>
  );
}
