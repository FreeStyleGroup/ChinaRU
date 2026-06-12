'use client';

/**
 * «Начать торговать» → «Мой магазин». Любой пользователь подаёт заявку на продавца
 * (данные компании) → модерация админом → после подтверждения открывается кабинет
 * магазина (Обзор). У магазина числовой ID; никнейм доступен после верификации.
 */
import { Button } from '@china-ru/ui';
import { useState } from 'react';


import { CompanyVacancies } from '@/components/cabinet/company-vacancies';
import { useSellerProfile } from '@/components/cabinet/seller-context';
import { accountClient, ClientApiError } from '@/lib/api-client';

import type { CreateSellerProfileInput, SellerProfileDto } from '@china-ru/shared';

const SELLER_TABS = [
  'Обзор',
  'Товары',
  'Заказы',
  'Магазин',
  'Аналитика',
  'Продвижение',
  'Помощь',
] as const;

function StoreHandle({ profile }: { profile: SellerProfileDto }) {
  return (
    <span className="font-mono text-ink">
      {profile.nickname ? `@${profile.nickname}` : `#${profile.publicId}`}
    </span>
  );
}

function OnboardingForm({
  rejected,
  onApplied,
}: {
  rejected: boolean;
  onApplied: (p: SellerProfileDto) => void;
}) {
  const [form, setForm] = useState<CreateSellerProfileInput>({
    companyName: '',
    inn: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  const set =
    (key: keyof CreateSellerProfileInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
    };

  const submit = async (): Promise<void> => {
    setStatus('saving');
    setError('');
    try {
      const cleaned: CreateSellerProfileInput = {
        companyName: form.companyName.trim(),
        inn: form.inn.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        ...(form.companyNameZh?.trim() ? { companyNameZh: form.companyNameZh.trim() } : {}),
        ...(form.legalType?.trim() ? { legalType: form.legalType.trim() } : {}),
        ...(form.description?.trim() ? { description: form.description.trim() } : {}),
      };
      onApplied(await accountClient.applySeller(cleaned));
    } catch (e) {
      setStatus('error');
      setError(e instanceof ClientApiError ? e.message : 'Не удалось отправить заявку');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Начать торговать</h1>
        <p className="mt-1 text-muted">
          Заполните данные компании — после проверки модератором у вас откроется кабинет магазина.
        </p>
      </div>

      {rejected && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm text-brand">
          Предыдущая заявка отклонена. Проверьте данные и отправьте повторно.
        </div>
      )}

      <form
        className="space-y-4 rounded-2xl border border-line bg-white p-6"
        onSubmit={e => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Название компании *</span>
          <input
            required
            value={form.companyName}
            onChange={set('companyName')}
            className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Название на китайском</span>
            <input
              value={form.companyNameZh ?? ''}
              onChange={set('companyNameZh')}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Форма (ООО, ИП, Co., Ltd…)</span>
            <input
              value={form.legalType ?? ''}
              onChange={set('legalType')}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">ИНН / регистрационный номер *</span>
          <input
            required
            value={form.inn ?? ''}
            onChange={set('inn')}
            className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Контактный email *</span>
            <input
              required
              type="email"
              value={form.contactEmail ?? ''}
              onChange={set('contactEmail')}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Контактный телефон *</span>
            <input
              required
              value={form.contactPhone ?? ''}
              onChange={set('contactPhone')}
              className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
            />
          </label>
        </div>
        <p className="text-xs text-muted">
          ИНН, email и телефон проверит модератор — указывайте действующие контакты.
        </p>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">О компании</span>
          <textarea
            rows={4}
            value={form.description ?? ''}
            onChange={set('description')}
            className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        {status === 'error' && <p className="text-sm text-brand">{error}</p>}
        <Button
          type="submit"
          disabled={
            status === 'saving' ||
            !form.companyName.trim() ||
            !form.inn?.trim() ||
            !form.contactEmail?.trim() ||
            !form.contactPhone?.trim()
          }
        >
          Отправить на модерацию
        </Button>
      </form>
    </div>
  );
}

function PendingState({ profile }: { profile: SellerProfileDto }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Мой магазин</h1>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="text-3xl">⏳</p>
        <p className="mt-2 text-lg font-semibold text-ink">Заявка на модерации</p>
        <p className="mt-1 text-sm text-muted">
          Заявка магазина <span className="font-mono">#{profile.publicId}</span> «
          {profile.companyName}» проверяется модератором. Обычно это занимает 1–2 рабочих дня.
        </p>
      </div>
    </div>
  );
}

function NicknamePanel({ profile, onSaved }: { profile: SellerProfileDto; onSaved: (p: SellerProfileDto) => void }) {
  const [value, setValue] = useState(profile.nickname ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  const save = async (): Promise<void> => {
    setStatus('saving');
    setError('');
    try {
      onSaved(await accountClient.setSellerNickname(value.trim()));
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof ClientApiError ? e.message : 'Не удалось сохранить никнейм');
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="font-medium text-ink">Никнейм магазина</p>
      <p className="mt-0.5 text-sm text-muted">
        Доступен после верификации. Заменяет числовой ID в ссылке на магазин.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-muted">@</span>
        <input
          value={value}
          onChange={e => {
            setValue(e.target.value);
          }}
          placeholder="my_store"
          className="h-10 w-48 rounded-lg border border-line px-3 outline-none focus:border-brand"
        />
        <Button
          variant="outline"
          disabled={status === 'saving' || !value.trim()}
          onClick={() => {
            void save();
          }}
        >
          Сохранить
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-brand">{error}</p>}
    </div>
  );
}

function SellerDashboard({
  profile,
  onProfile,
}: {
  profile: SellerProfileDto;
  onProfile: (p: SellerProfileDto) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          {profile.companyName}
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white"
            title="Магазин верифицирован"
          >
            ✓
          </span>
        </h1>
        <span className="text-sm text-muted">
          Магазин: <StoreHandle profile={profile} />
        </span>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {SELLER_TABS.map((t, i) => (
          <span
            key={t}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${
              i === 0 ? 'border-brand font-medium text-brand' : 'border-transparent text-muted'
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-sm text-muted">Финансы</p>
          <p className="mt-1 text-2xl font-bold text-ink">152 340,50 ₽</p>
          <p className="text-sm text-muted">Можно вывести: 121 800 ₽</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-sm text-muted">Споры</p>
          <p className="mt-1 text-sm text-ink">Новые: 1 · В процессе: 3 · Ждут возврата: 0</p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <p className="mb-3 text-sm font-semibold text-muted">Товары</p>
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
          {[
            ['В продаже', 250],
            ['Нет в наличии', 15],
            ['Заблокировано', 2],
            ['На рассмотрении', 5],
            ['Нужно исправить', 1],
            ['Снято с продажи', 10],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface p-3">
              <p className="text-xl font-bold text-ink">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <p className="mb-3 text-sm font-semibold text-muted">Ключевые метрики · за сутки</p>
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
          {[
            ['Просмотры', '12 540'],
            ['Посетители', '8 930'],
            ['Заказы', '112'],
            ['Выручка', '256 780 ₽'],
            ['CTR', '2.5%'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface p-3">
              <p className="text-lg font-bold text-ink">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <CompanyVacancies />

      <NicknamePanel profile={profile} onSaved={onProfile} />

      <p className="text-center text-xs text-muted">
        Демонстрационные показатели — данные подключаются вместе с товарами и заказами продавца.
      </p>
    </div>
  );
}

export default function StorePage() {
  const { profile, loading, setProfile } = useSellerProfile();

  if (loading) {
    return <p className="text-muted">Загрузка…</p>;
  }
  if (!profile || profile.verifyStatus === 'unverified') {
    return <OnboardingForm rejected={false} onApplied={setProfile} />;
  }
  if (profile.verifyStatus === 'rejected') {
    return <OnboardingForm rejected onApplied={setProfile} />;
  }
  if (profile.verifyStatus === 'pending') {
    return <PendingState profile={profile} />;
  }
  return <SellerDashboard profile={profile} onProfile={setProfile} />;
}
