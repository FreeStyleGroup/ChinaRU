'use client';

import { slugify } from '@china-ru/shared';
import { Button } from '@china-ru/ui';
import { useEffect, useRef, useState } from 'react';

import { catalogClient, ClientApiError, sellerProductClient } from '@/lib/api-client';

import type {
  CategoryTreeNode,
  CreateProductInput,
  ProductDto,
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

interface FormState {
  categoryId: string;
  slug: string;
  sku: string;
  nameRu: string;
  nameEn: string;
  nameZh: string;
  descriptionRu: string;
  price: string;
  stock: string;
  status: ProductStatus;
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
    stock: '0',
    status: 'active',
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
    price: p.price,
    stock: String(p.stock),
    status: p.status,
  };
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

const inputCls =
  'h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand';

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

  const save = async (): Promise<void> => {
    setStatus('saving');
    setError('');
    try {
      if (product) {
        const patch: UpdateProductInput = {
          categoryId: form.categoryId,
          slug: form.slug.trim(),
          sku: form.sku.trim(),
          nameRu: form.nameRu.trim(),
          price: form.price.trim(),
          stock: Number(form.stock),
          status: form.status,
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
          price: form.price.trim(),
          stock: Number(form.stock),
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
          pending.length > 0 ? await uploadAll(created, pending.map(p => p.file)) : 0;
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
        failed.push(`«${file.name}»: ${err instanceof ClientApiError ? err.message : 'не загрузилось'}`);
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
      setPending(prev => [...prev, ...ok.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
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
            <select required value={form.categoryId} onChange={set('categoryId')} className={inputCls}>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Цена, ₽ *</span>
            <input
              required
              value={form.price}
              onChange={set('price')}
              placeholder="1500.00"
              className={inputCls}
            />
          </label>
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

        {/* Фотографии: у нового товара копятся до создания, у сохранённого — загружаются сразу */}
        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink">Фотографии</p>
          <div className="flex flex-wrap gap-3">
            {product?.images.map(img => (
              <div key={img.id} className="relative h-24 w-24 overflow-hidden rounded-xl border border-line">
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
              <div key={p.preview} className="relative h-24 w-24 overflow-hidden rounded-xl border border-dashed border-brand/50">
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
                uploading ? 'cursor-wait opacity-60' : 'cursor-pointer hover:border-brand hover:text-brand'
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
              !form.price.trim()
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
                className="flex items-center gap-4 rounded-2xl border border-line bg-white p-3"
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
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{p.nameRu}</p>
                  <p className="text-xs text-muted">
                    {p.sku} · {p.price} {p.currency.toUpperCase()} · остаток {p.stock}
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
