'use client';

/**
 * «Мой магазин» → «Магазин» → «Оформление магазина»: описание, баннер и логотип
 * публичной страницы магазина. Предпросмотр повторяет шапку страницы магазина,
 * выбранная картинка видна в нём сразу, ещё до окончания загрузки.
 */
import { Button, buttonVariants, cn } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { StoreLogo } from '@/components/store/store-identity';
import { Link } from '@/i18n/navigation';
import { accountClient, ClientApiError } from '@/lib/api-client';
import { storePath } from '@/lib/store';

import type { SellerProfileDto } from '@china-ru/shared';

type ImageKind = 'banner' | 'logo';

/** Те же ограничения, что проверяет API, — понятная ошибка до отправки файла. */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB: Record<ImageKind, number> = { banner: 5, logo: 2 };
const DESCRIPTION_MAX = 4000;

interface ImageSlot {
  /** Локальное превью выбранного файла, пока он загружается. */
  preview: string | null;
  busy: boolean;
  error: string;
  upload: (file: File) => Promise<void>;
  remove: () => Promise<void>;
}

function useStoreImage(kind: ImageKind, onSaved: (p: SellerProfileDto) => void): ImageSlot {
  const t = useTranslations('cabinetStore');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Превью живёт в памяти браузера — освобождаем при замене и при уходе со страницы.
  const previewRef = useRef<string | null>(null);
  const setLocalPreview = (url: string | null): void => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  };
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const upload = async (file: File): Promise<void> => {
    setError('');
    if (!IMAGE_TYPES.includes(file.type)) {
      setError(t('errorType', { name: file.name }));
      return;
    }
    if (file.size > MAX_MB[kind] * 1024 * 1024) {
      setError(t('errorSize', { name: file.name, max: MAX_MB[kind] }));
      return;
    }
    setLocalPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      onSaved(
        kind === 'banner'
          ? await accountClient.uploadStoreBanner(file)
          : await accountClient.uploadStoreLogo(file)
      );
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : t('errorUpload'));
    } finally {
      setBusy(false);
      setLocalPreview(null);
    }
  };

  const remove = async (): Promise<void> => {
    setError('');
    setBusy(true);
    try {
      onSaved(
        kind === 'banner'
          ? await accountClient.removeStoreBanner()
          : await accountClient.removeStoreLogo()
      );
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : t('errorRemove'));
    } finally {
      setBusy(false);
    }
  };

  return { preview, busy, error, upload, remove };
}

function Spinner() {
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-white/60" aria-hidden>
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </span>
  );
}

function ImageControls({
  title,
  hint,
  hasImage,
  slot,
}: {
  title: string;
  hint: string;
  hasImage: boolean;
  slot: ImageSlot;
}) {
  const t = useTranslations('cabinetStore');
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={slot.busy}
          onClick={() => {
            input.current?.click();
          }}
        >
          {slot.busy ? t('uploading') : hasImage ? t('replace') : t('upload')}
        </Button>
        {hasImage && (
          <Button
            variant="ghost"
            size="sm"
            disabled={slot.busy}
            className="text-muted hover:text-brand"
            onClick={() => {
              void slot.remove();
            }}
          >
            {t('remove')}
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="hidden"
        aria-label={title}
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void slot.upload(file);
        }}
      />
      {slot.error && (
        <p role="alert" className="mt-2 text-xs text-brand">
          {slot.error}
        </p>
      )}
    </div>
  );
}

export function StoreDesign({
  profile,
  onSaved,
}: {
  profile: SellerProfileDto;
  onSaved: (p: SellerProfileDto) => void;
}) {
  const t = useTranslations('cabinetStore');
  const banner = useStoreImage('banner', onSaved);
  const logo = useStoreImage('logo', onSaved);

  const [text, setText] = useState(profile.description ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const dirty = text.trim() !== (profile.description ?? '');

  const saveDescription = async (): Promise<void> => {
    setSaveState('saving');
    setSaveError('');
    try {
      const value = text.trim();
      onSaved(await accountClient.updateStore({ description: value === '' ? null : value }));
      setText(value);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      setSaveError(e instanceof ClientApiError ? e.message : t('errorSave'));
    }
  };

  const bannerSrc = banner.preview ?? profile.bannerUrl;
  const logoSrc = logo.preview ?? profile.logoUrl;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0 max-w-xl">
          <h2 className="text-lg font-semibold text-ink">{t('designTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('designLead')}</p>
          <p className="mt-1 text-xs text-muted">{t('cacheHint')}</p>
        </div>
        {profile.verifyStatus === 'verified' && (
          <Link
            href={storePath(profile)}
            target="_blank"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
          >
            {t('openStore')} <span aria-hidden>↗</span>
          </Link>
        )}
      </div>

      {/* Предпросмотр шапки — так же, как на странице магазина. */}
      <div className="px-5">
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="relative h-28 bg-ink sm:aspect-[4/1] sm:h-auto">
            {bannerSrc ? (
              <img src={bannerSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-br from-brand via-brand-dark to-ink"
              />
            )}
            {banner.busy && <Spinner />}
          </div>
          <div className="flex items-end gap-4 px-4 pb-4">
            <div className="relative -mt-10 h-20 w-20 shrink-0 sm:-mt-12 sm:h-24 sm:w-24">
              <StoreLogo
                name={profile.companyName}
                logoUrl={logoSrc}
                className="h-full w-full rounded-2xl border-4 border-white text-2xl shadow-md"
              />
              {logo.busy && <Spinner />}
            </div>
            <p className="min-w-0 truncate pb-1 font-semibold text-ink">{profile.companyName}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <ImageControls
          title={t('banner')}
          hint={t('bannerHint')}
          hasImage={profile.bannerUrl !== null}
          slot={banner}
        />
        <ImageControls
          title={t('logo')}
          hint={t('logoHint')}
          hasImage={profile.logoUrl !== null}
          slot={logo}
        />
      </div>

      <form
        className="space-y-2 border-t border-line p-5"
        onSubmit={e => {
          e.preventDefault();
          void saveDescription();
        }}
      >
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">{t('description')}</span>
          <span className="block text-xs text-muted">{t('descriptionHint')}</span>
          <textarea
            rows={6}
            maxLength={DESCRIPTION_MAX}
            value={text}
            onChange={e => {
              setText(e.target.value);
              setSaveState('idle');
            }}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted tabular-nums">
            {t('counter', { count: text.length, max: DESCRIPTION_MAX })}
          </span>
          <div className="flex items-center gap-3">
            {saveState === 'saved' && (
              <span role="status" className="text-sm text-emerald-700">
                {t('saved')}
              </span>
            )}
            <Button type="submit" disabled={saveState === 'saving' || !dirty}>
              {saveState === 'saving' ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
        {saveState === 'error' && (
          <p role="alert" className="text-sm text-brand">
            {saveError}
          </p>
        )}
      </form>
    </section>
  );
}
