'use client';

import { slugify } from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { catalogClient, ClientApiError, sellerProductClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/format';

import type {
  CategoryTreeNode,
  CreateProductInput,
  ProductDto,
  ProductSpec,
  ProductStatus,
  UpdateProductInput,
} from '@china-ru/shared';

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Черновик',
  active: 'В продаже',
  paused: 'Снят с продажи',
  banned: 'Заблокирован',
};
const SELLER_STATUSES: ProductStatus[] = ['draft', 'active', 'paused'];

interface CategoryOption {
  id: string;
  label: string;
}

function flattenCategories(nodes: CategoryTreeNode[], depth = 0): CategoryOption[] {
  return nodes.flatMap(n => [
    { id: n.id, label: `${'  '.repeat(depth)}${n.nameRu}` },
    ...flattenCategories(n.children, depth + 1),
  ]);
}

/** Строка редактора характеристик; `key` — только для React, на сервер не уходит. */
interface SpecRow {
  key: number;
  name: string;
  value: string;
}

/** Границы как у `productSpecsSchema` в @china-ru/shared. */
const SPECS_MAX = 40;
const SPEC_NAME_MAX = 120;
const SPEC_VALUE_MAX = 500;

let specRowSeq = 0;
function specRow(name = '', value = ''): SpecRow {
  specRowSeq += 1;
  return { key: specRowSeq, name, value };
}

interface FormState {
  categoryId: string;
  slug: string;
  sku: string;
  nameRu: string;
  nameEn: string;
  nameZh: string;
  descriptionRu: string;
  price: string;
  /** «Цена по запросу»: цена не указывается, покупатели присылают запрос цены. */
  priceOnRequest: boolean;
  stock: string;
  status: ProductStatus;
  specs: SpecRow[];
}

function blankForm(categoryId: string): FormState {
  return {
    categoryId,
    slug: '',
    sku: '',
    nameRu: '',
    nameEn: '',
    nameZh: '',
    descriptionRu: '',
    price: '',
    priceOnRequest: false,
    stock: '0',
    status: 'active',
    specs: [],
  };
}

function formFromProduct(p: ProductDto): FormState {
  return {
    categoryId: p.categoryId,
    slug: p.slug,
    sku: p.sku,
    nameRu: p.nameRu,
    nameEn: p.nameEn ?? '',
    nameZh: p.nameZh ?? '',
    descriptionRu: p.descriptionRu ?? '',
    price: p.price ?? '',
    priceOnRequest: p.price === null,
    stock: String(p.stock),
    status: p.status,
    specs: p.specs.map(s => specRow(s.name, s.value)),
  };
}

/**
 * Характеристики к отправке: пустые строки отбрасываются; строка, где заполнено
 * только одно поле, — ошибка (иначе продавец молча потерял бы половину данных).
 */
function specsToSave(rows: SpecRow[]): ProductSpec[] | null {
  const filled = rows
    .map(r => ({ name: r.name.trim(), value: r.value.trim() }))
    .filter(r => r.name !== '' || r.value !== '');
  if (filled.some(r => r.name === '' || r.value === '')) return null;
  return filled;
}

/** Ограничения API на фото товара — проверяем до отправки, чтобы ошибка была понятной сразу. */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function imageProblem(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return `«${file.name}» — нужен JPG, PNG или WebP`;
  if (file.size > IMAGE_MAX_BYTES) return `«${file.name}» больше 5 МБ`;
  return null;
}

/** Выбранное, но ещё не загруженное фото нового товара (с превью из памяти браузера). */
interface PendingImage {
  file: File;
  preview: string;
}

const inputCls = 'h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand';

function ProductForm({
  initial,
  categories,
  onSaved,
  onClose,
}: {
  initial: ProductDto | null;
  categories: CategoryOption[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const tp = useTranslations('sellerProduct');
  const [product, setProduct] = useState<ProductDto | null>(initial);
  const [form, setForm] = useState<FormState>(
    initial ? formFromProduct(initial) : blankForm(categories[0]?.id ?? '')
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');
  /**
   * Адрес товара (slug) у нового товара собирается из названия транслитом, пока
   * продавец не впишет свой. У существующего товара адрес не трогаем: он уже в
   * ссылках и поисковой выдаче. Очистил поле — снова собирается из названия.
   */
  const [slugManual, setSlugManual] = useState(initial !== null);
  /**
   * Фото нового товара: API принимает их только для уже созданного товара, поэтому
   * до сохранения они ждут здесь и уходят сразу после «Создать товар».
   */
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  /**
   * Названия EN и 中文 переводятся из русского автоматически (ИИ на сервере), пока
   * продавец не впишет своё. Перевод — подсказка: поля можно поправить до сохранения.
   */
  const [enManual, setEnManual] = useState(Boolean(initial?.nameEn));
  const [zhManual, setZhManual] = useState(Boolean(initial?.nameZh));
  const [translate, setTranslate] = useState<{
    state: 'idle' | 'busy' | 'done' | 'off';
    from: string;
  }>({ state: 'idle', from: initial?.nameRu ?? '' });

  // Превью живут в памяти браузера — освобождаем их, когда форма закрывается.
  // Через ref: очистке при размонтировании нужен последний список, а не первый.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(
    () => () => {
      pendingRef.current.forEach(p => {
        URL.revokeObjectURL(p.preview);
      });
    },
    []
  );

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
    };

  const setName = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const nameRu = e.target.value;
    setForm(prev => ({ ...prev, nameRu, ...(slugManual ? {} : { slug: slugify(nameRu) }) }));
  };

  const setTranslated =
    (key: 'nameEn' | 'nameZh') =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;
      (key === 'nameEn' ? setEnManual : setZhManual)(value.trim() !== '');
      setForm(prev => ({ ...prev, [key]: value }));
    };

  /** Переводит русское название в незаполненные вручную поля EN и 中文. */
  const translateName = async (): Promise<void> => {
    const nameRu = form.nameRu.trim();
    if (!nameRu || nameRu === translate.from || (enManual && zhManual)) return;
    setTranslate({ state: 'busy', from: nameRu });
    try {
      const t = await sellerProductClient.translateName(nameRu);
      if (!t.available) {
        setTranslate({ state: 'off', from: nameRu });
        return;
      }
      setForm(prev => ({
        ...prev,
        ...(enManual ? {} : { nameEn: t.nameEn }),
        ...(zhManual ? {} : { nameZh: t.nameZh }),
      }));
      setTranslate({ state: 'done', from: nameRu });
    } catch {
      // Перевод — удобство, а не обязательное поле: при сбое продавец впишет сам.
      setTranslate({ state: 'idle', from: '' });
    }
  };

  const setSlug = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const slug = e.target.value;
    setSlugManual(slug.trim() !== '');
    setForm(prev => ({ ...prev, slug: slug.trim() === '' ? slugify(prev.nameRu) : slug }));
  };

  const setSpec =
    (key: number, field: 'name' | 'value') =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const text = e.target.value;
      setForm(prev => ({
        ...prev,
        specs: prev.specs.map(r => (r.key === key ? { ...r, [field]: text } : r)),
      }));
    };

  const addSpec = (): void => {
    setForm(prev =>
      prev.specs.length >= SPECS_MAX ? prev : { ...prev, specs: [...prev.specs, specRow()] }
    );
  };

  const removeSpec = (key: number): void => {
    setForm(prev => ({ ...prev, specs: prev.specs.filter(r => r.key !== key) }));
  };

  const save = async (): Promise<void> => {
    setError('');
    const specs = specsToSave(form.specs);
    if (!specs) {
      setStatus('error');
      setError(tp('specIncomplete'));
      return;
    }
    // null — «цена по запросу»: покупатели вместо корзины присылают запрос цены.
    const price = form.priceOnRequest ? null : form.price.trim();
    setStatus('saving');
    try {
      if (product) {
        const patch: UpdateProductInput = {
          categoryId: form.categoryId,
          slug: form.slug.trim(),
          sku: form.sku.trim(),
          nameRu: form.nameRu.trim(),
          price,
          stock: Number(form.stock),
          status: form.status,
          // Все строки целиком: удалённая в форме характеристика удаляется и у товара.
          specs,
          ...(form.nameEn.trim() ? { nameEn: form.nameEn.trim() } : {}),
          ...(form.nameZh.trim() ? { nameZh: form.nameZh.trim() } : {}),
          ...(form.descriptionRu.trim() ? { descriptionRu: form.descriptionRu.trim() } : {}),
        };
        setProduct(await sellerProductClient.update(product.id, patch));
      } else {
        const input: CreateProductInput = {
          categoryId: form.categoryId,
          slug: form.slug.trim(),
          sku: form.sku.trim(),
          nameRu: form.nameRu.trim(),
          price,
          stock: Number(form.stock),
          ...(specs.length > 0 ? { specs } : {}),
          ...(form.nameEn.trim() ? { nameEn: form.nameEn.trim() } : {}),
          ...(form.nameZh.trim() ? { nameZh: form.nameZh.trim() } : {}),
          ...(form.descriptionRu.trim() ? { descriptionRu: form.descriptionRu.trim() } : {}),
        };
        // API создаёт товар черновиком; выбранный в форме статус ставим следом.
        let created = await sellerProductClient.create(input);
        if (form.status !== created.status) {
          created = await sellerProductClient.update(created.id, { status: form.status });
        }
        setProduct(created);
        const failedPhotos =
          pending.length > 0
            ? await uploadAll(
                created,
                pending.map(p => p.file)
              )
            : 0;
        pending.forEach(p => {
          URL.revokeObjectURL(p.preview);
        });
        setPending([]);
        setStatus('idle');
        // Часть фото не загрузилась — остаёмся в форме с ошибкой, иначе к списку.
        if (failedPhotos === 0) onClose();
        else onSaved();
        return;
      }
      setStatus('idle');
      onClose();
    } catch (e) {
      setStatus('error');
      setError(e instanceof ClientApiError ? e.message : 'Не удалось сохранить товар');
    }
  };

  /** Загружает файлы по одному; ошибку по файлу показывает, остальные не останавливает. */
  const uploadAll = async (target: ProductDto, files: File[]): Promise<number> => {
    let current = target;
    const failed: string[] = [];
    setUploading(true);
    for (const file of files) {
      try {
        current = await sellerProductClient.addImage(current.id, file);
        setProduct(current);
      } catch (err) {
        failed.push(
          `«${file.name}»: ${err instanceof ClientApiError ? err.message : 'не загрузилось'}`
        );
      }
    }
    setUploading(false);
    if (failed.length > 0) setError(`Не загружены фото — ${failed.join('; ')}`);
    onSaved();
    return failed.length;
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const problems = files.map(imageProblem).filter((m): m is string => m !== null);
    const ok = files.filter(f => imageProblem(f) === null);
    setError(problems.join('; '));
    if (ok.length === 0) return;
    if (product) {
      await uploadAll(product, ok);
    } else {
      setPending(prev => [
        ...prev,
        ...ok.map(file => ({ file, preview: URL.createObjectURL(file) })),
      ]);
    }
  };

  const removePending = (index: number): void => {
    setPending(prev => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeImage = async (imageId: string): Promise<void> => {
    if (!product) return;
    try {
      setProduct(await sellerProductClient.removeImage(product.id, imageId));
      onSaved();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Не удалось удалить фото');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">
          {product ? 'Редактирование товара' : 'Новый товар'}
        </h2>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink">
          ← К списку
        </button>
      </div>

      <form
        className="space-y-4 rounded-2xl border border-line bg-white p-6"
        onSubmit={e => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Название *</span>
          <input
            required
            value={form.nameRu}
            onChange={setName}
            onBlur={() => {
              void translateName();
            }}
            className={inputCls}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Артикул (SKU) *</span>
            <input required value={form.sku} onChange={set('sku')} className={inputCls} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">URL (slug) *</span>
            <input
              required
              value={form.slug}
              onChange={setSlug}
              // Своё значение приводим к виду адреса: латиница, цифры, дефисы.
              onBlur={() => {
                setForm(prev => ({ ...prev, slug: slugify(prev.slug) }));
              }}
              placeholder="operativnaya-pamyat-ddr5"
              className={inputCls}
            />
            <span className="block text-xs text-muted">
              Заполняется из названия, можно поправить вручную.
            </span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Категория *</span>
            <select
              required
              value={form.categoryId}
              onChange={set('categoryId')}
              className={inputCls}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">
                Цена, ₽{form.priceOnRequest ? '' : ' *'}
              </span>
              {/* Флажок «по запросу» сохраняет набранную цену: снял — она вернулась. */}
              <input
                required={!form.priceOnRequest}
                disabled={form.priceOnRequest}
                inputMode="decimal"
                value={form.priceOnRequest ? '' : form.price}
                onChange={set('price')}
                placeholder={form.priceOnRequest ? tp('priceOnRequest') : '1500.00'}
                className={`${inputCls} disabled:bg-surface disabled:text-muted`}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.priceOnRequest}
                onChange={e => {
                  const checked = e.target.checked;
                  setForm(prev => ({ ...prev, priceOnRequest: checked }));
                }}
                className="h-4 w-4 shrink-0 accent-brand"
              />
              {tp('priceOnRequest')}
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Остаток *</span>
            <input
              required
              type="number"
              min={0}
              value={form.stock}
              onChange={set('stock')}
              className={inputCls}
            />
          </label>
        </div>
        {form.priceOnRequest && (
          <p className="-mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
            {tp('priceOnRequestHint')}
          </p>
        )}

        <div className="space-y-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Название (EN)</span>
              <input
                value={form.nameEn}
                onChange={setTranslated('nameEn')}
                placeholder={translate.state === 'busy' ? 'Переводим…' : ''}
                className={inputCls}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Название (中文)</span>
              <input
                value={form.nameZh}
                onChange={setTranslated('nameZh')}
                placeholder={translate.state === 'busy' ? 'Переводим…' : ''}
                className={inputCls}
              />
            </label>
          </div>
          <p className="text-xs text-muted">
            {translate.state === 'busy' && 'Переводим название…'}
            {translate.state === 'done' &&
              'Переведено автоматически — проверьте и при необходимости поправьте.'}
            {translate.state === 'off' &&
              'Автоперевод недоступен: на сервере не настроен ИИ. Заполните вручную.'}
            {translate.state === 'idle' && 'Заполнятся автоматически из названия на русском.'}
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Описание</span>
          <textarea
            rows={4}
            value={form.descriptionRu}
            onChange={set('descriptionRu')}
            className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        {/* Характеристики: строки «название — значение», до 40 — таблица на странице товара */}
        <div className="space-y-3 border-t border-line pt-4">
          <div>
            <p className="text-sm font-semibold text-ink">{tp('specs')}</p>
            <p className="text-xs text-muted">{tp('specsHint')}</p>
          </div>
          {form.specs.length > 0 && (
            <ul className="space-y-2">
              {form.specs.map((row, i) => (
                <li key={row.key} className="flex items-start gap-2">
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <input
                      value={row.name}
                      onChange={setSpec(row.key, 'name')}
                      maxLength={SPEC_NAME_MAX}
                      placeholder={tp('specName')}
                      aria-label={`${tp('specName')} ${i + 1}`}
                      className={inputCls}
                    />
                    <input
                      value={row.value}
                      onChange={setSpec(row.key, 'value')}
                      maxLength={SPEC_VALUE_MAX}
                      placeholder={tp('specValue')}
                      aria-label={`${tp('specValue')} ${i + 1}`}
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeSpec(row.key);
                    }}
                    aria-label={`${tp('removeSpec')} ${i + 1}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted hover:bg-surface hover:text-brand"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSpec}
              disabled={form.specs.length >= SPECS_MAX}
            >
              {tp('addSpec')}
            </Button>
            <span className="text-xs text-muted tabular-nums">
              {form.specs.length} / {SPECS_MAX}
            </span>
          </div>
        </div>

        {/* Фотографии: у нового товара копятся до создания, у сохранённого — загружаются сразу */}
        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink">Фотографии</p>
          <div className="flex flex-wrap gap-3">
            {product?.images.map(img => (
              <div
                key={img.id}
                className="relative h-24 w-24 overflow-hidden rounded-xl border border-line"
              >
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    void removeImage(img.id);
                  }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  aria-label="Удалить фото"
                >
                  ×
                </button>
                {img.isPrimary && (
                  <span className="absolute bottom-0 left-0 right-0 bg-brand/80 py-0.5 text-center text-[10px] text-white">
                    главная
                  </span>
                )}
              </div>
            ))}
            {pending.map((p, i) => (
              <div
                key={p.preview}
                className="relative h-24 w-24 overflow-hidden rounded-xl border border-dashed border-brand/50"
              >
                <img src={p.preview} alt="" className="h-full w-full object-cover opacity-80" />
                <button
                  type="button"
                  onClick={() => {
                    removePending(i);
                  }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  aria-label="Убрать фото"
                >
                  ×
                </button>
                {i === 0 && (product?.images.length ?? 0) === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-brand/80 py-0.5 text-center text-[10px] text-white">
                    главная
                  </span>
                )}
              </div>
            ))}
            <label
              className={`flex h-24 w-24 flex-col items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted ${
                uploading
                  ? 'cursor-wait opacity-60'
                  : 'cursor-pointer hover:border-brand hover:text-brand'
              }`}
            >
              {uploading ? 'Загрузка…' : '+ фото'}
              <input
                type="file"
                accept={IMAGE_TYPES.join(',')}
                multiple
                disabled={uploading}
                className="hidden"
                onChange={e => {
                  void onFiles(e);
                }}
              />
            </label>
          </div>
          <p className="text-xs text-muted">
            JPG, PNG или WebP, до 5 МБ, можно несколько сразу. Первое фото становится главным.
            {!product && pending.length > 0 && ' Загрузятся вместе с товаром при сохранении.'}
          </p>
        </div>

        <label className="block space-y-1 border-t border-line pt-4">
          <span className="text-sm font-medium text-ink">Статус</span>
          <select value={form.status} onChange={set('status')} className={`${inputCls} sm:w-56`}>
            {SELLER_STATUSES.map(s => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-brand">{error}</p>}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              status === 'saving' ||
              uploading ||
              !form.nameRu.trim() ||
              !form.sku.trim() ||
              !form.slug.trim() ||
              !form.categoryId ||
              (!form.priceOnRequest && !form.price.trim())
            }
          >
            {status === 'saving' ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function SellerProducts() {
  const tp = useTranslations('sellerProduct');
  const [products, setProducts] = useState<ProductDto[] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [editing, setEditing] = useState<{ mode: 'new' } | { mode: 'edit'; id: string } | null>(
    null
  );
  const [error, setError] = useState('');

  const refresh = (): void => {
    void sellerProductClient
      .list()
      .then(setProducts)
      .catch(() => {
        setProducts([]);
      });
  };

  useEffect(() => {
    refresh();
    void catalogClient
      .categories()
      .then(tree => {
        setCategories(flattenCategories(tree));
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  const remove = async (id: string): Promise<void> => {
    setError('');
    try {
      await sellerProductClient.remove(id);
      refresh();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : 'Не удалось удалить товар');
    }
  };

  if (editing?.mode === 'new') {
    return (
      <ProductForm
        initial={null}
        categories={categories}
        onSaved={refresh}
        onClose={() => {
          setEditing(null);
          refresh();
        }}
      />
    );
  }
  if (editing) {
    const current = products?.find(p => p.id === editing.id) ?? null;
    return (
      <ProductForm
        initial={current}
        categories={categories}
        onSaved={refresh}
        onClose={() => {
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {products ? `${products.length} товаров` : 'Загрузка…'}
        </p>
        <Button
          onClick={() => {
            setEditing({ mode: 'new' });
          }}
          disabled={categories.length === 0}
        >
          + Добавить товар
        </Button>
      </div>

      {error && <p className="text-sm text-brand">{error}</p>}

      {products?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">
          Товаров пока нет. Добавьте первый — он появится в каталоге после публикации.
        </div>
      )}

      {products && products.length > 0 && (
        <div className="space-y-2">
          {products.map(p => {
            const img = p.images.find(i => i.isPrimary) ?? p.images[0];
            return (
              <div
                key={p.id}
                // flex-wrap + basis у текста: на телефоне статус и кнопки уходят второй строкой.
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-white p-3"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                  {img ? (
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-line">
                      {p.nameRu.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate font-medium text-ink">{p.nameRu}</p>
                  <p className="text-xs text-muted">
                    {p.sku} ·{' '}
                    {p.price === null
                      ? tp('listOnRequest')
                      : formatPrice(p.price, p.currency, 'ru-RU')}{' '}
                    · остаток {p.stock}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    p.status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : p.status === 'draft'
                        ? 'bg-surface text-muted'
                        : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {STATUS_LABELS[p.status]}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing({ mode: 'edit', id: p.id });
                    }}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void remove(p.id);
                    }}
                    className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-brand"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
