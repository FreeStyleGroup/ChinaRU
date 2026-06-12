import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { catalogApi } from '@/lib/api';
import { absoluteUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = routing.locales.flatMap(locale => [
    { url: absoluteUrl(`/${locale}`), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl(`/${locale}/catalog`), changeFrequency: 'daily', priority: 0.8 },
  ]);

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await catalogApi.products({ pageSize: 100, status: 'active' });
    productEntries = res.items.flatMap(p =>
      routing.locales.map(locale => ({
        url: absoluteUrl(`/${locale}/catalog/${p.slug}`),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    );
  } catch {
    // API недоступен при сборке — отдаём только статические URL.
  }

  return [...staticEntries, ...productEntries];
}
