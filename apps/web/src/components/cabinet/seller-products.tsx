'use client';

import { Button } from '@china-ru/ui';
import { useEffect, useState } from 'react';

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
    status: 'draft',
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

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
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
        // После создания переходим в режим редактирования, чтобы можно было загрузить фото.
        setProduct(await sellerProductClient.create(input));
      }
      setStatus('idle');
      onSaved();
    } catch (e) {
      setStatus('error');
      setError(e instanceof ClientApiError ? e.message : 'Не удалось сохранить товар');
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !product) return;
    setError('');
    try {
      setProduct(await sellerProductClient.addImage(product.id, file));
      onSaved();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Не удалось загрузить фото');
    }
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
          <input required value={form.nameRu} onChange={set('nameRu')} className={inputCls} />
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
              onChange={set('slug')}
              placeholder="cnc-router-1325"
              className={inputCls}
            />
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Название (EN)</span>
            <input value={form.nameEn} onChange={set('nameEn')} className={inputCls} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Название (中文)</span>
            <input value={form.nameZh} onChange={set('nameZh')} className={inputCls} />
          </label>
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

        {product && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Статус</span>
            <select value={form.status} onChange={set('status')} className={`${inputCls} sm:w-56`}>
              {SELLER_STATUSES.map(s => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="text-sm text-brand">{error}</p>}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              status === 'saving' ||
              !form.nameRu.trim() ||
              !form.sku.trim() ||
              !form.slug.trim() ||
              !form.categoryId ||
              !form.price.trim()
            }
          >
            {product ? 'Сохранить' : 'Создать товар'}
          </Button>
          {product && (
            <Button type="button" variant="outline" onClick={onClose}>
              Готово
            </Button>
          )}
        </div>
      </form>

      {/* Фотографии — доступны у сохранённого товара */}
      {product && (
        <div className="space-y-3 rounded-2xl border border-line bg-white p-6">
          <p className="text-sm font-semibold text-ink">Фотографии</p>
          <div className="flex flex-wrap gap-3">
            {product.images.map(img => (
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
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted hover:border-brand hover:text-brand">
              + фото
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  void onFile(e);
                }}
              />
            </label>
          </div>
          <p className="text-xs text-muted">JPG/PNG/WebP, до 5 МБ. Первое фото становится главным.</p>
        </div>
      )}
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
