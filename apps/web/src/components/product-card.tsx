import { Card, CardBody } from '@china-ru/ui';

import type { ProductDto } from '@china-ru/shared';

import { Link } from '@/i18n/navigation';
import { formatPrice } from '@/lib/format';

export function ProductCard({ product, locale }: { product: ProductDto; locale: string }) {
  const image = product.images[0];

  return (
    <Link href={`/catalog/${product.slug}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <div className="aspect-square overflow-hidden bg-surface">
          {image ? (
            <img
              src={image.url}
              alt={product.nameRu}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl font-bold text-line">
              {product.nameRu.slice(0, 1)}
            </div>
          )}
        </div>
        <CardBody className="space-y-2">
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-ink">{product.nameRu}</h3>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">
              {formatPrice(product.price, product.currency, locale)}
            </span>
            {product.reviewCount > 0 && (
              <span className="text-xs text-muted">★ {product.rating}</span>
            )}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
