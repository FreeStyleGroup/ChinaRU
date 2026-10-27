import type { ProductDto } from '@china-ru/shared';
import type { Metadata } from 'next';

export const SITE_NAME = 'China.ru';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://china.ru';

/** Абсолютный URL для каноникал/OG. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  locale: string;
  images?: string[];
}

/** Собирает Metadata с canonical + Open Graph. */
export function buildMetadata(input: PageMetaInput): Metadata {
  const url = absoluteUrl(input.path);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      locale: input.locale,
      type: 'website',
      ...(input.images && input.images.length > 0 ? { images: input.images } : {}),
    },
  };
}

/** JSON-LD Schema.org Product. По умолчанию русские поля; можно передать локализованные. */
export function productJsonLd(
  product: ProductDto,
  path: string,
  override?: { name?: string; description?: string | null }
): Record<string, unknown> {
  const name = override?.name ?? product.nameRu;
  const description = override?.description ?? product.descriptionRu;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    sku: product.sku,
    ...(description ? { description } : {}),
    ...(product.images.length > 0 ? { image: product.images.map(i => i.url) } : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency.toUpperCase(),
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      url: absoluteUrl(path),
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };
}

/** JSON-LD Schema.org Organization (для главной). */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Маркетплейс промышленного оборудования из Китая.',
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/** JSON-LD BreadcrumbList. */
export function breadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}
