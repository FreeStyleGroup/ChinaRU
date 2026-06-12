import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Самодостаточный сервер для Docker (минимальный node_modules в образе).
  output: 'standalone',
  // Корень трейсинга — корень монорепо, чтобы в standalone попали workspace-пакеты.
  outputFileTracingRoot: join(here, '../..'),
  // Транспиляция workspace-пакетов (исходники .ts) при сборке.
  transpilePackages: ['@china-ru/ui', '@china-ru/shared'],
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
