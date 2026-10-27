import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

/**
 * Маршрутизация локалей: `/` и пути без префикса уводятся на язык посетителя
 * (cookie NEXT_LOCALE, затем Accept-Language, иначе локаль по умолчанию).
 * Без middleware страницы живут только под `/ru`, `/en`, `/zh`, а корень
 * сайта отдаёт 404.
 */
export default createMiddleware(routing);

export const config = {
  // Все пути, кроме внутренних `/_next`, `/_vercel` и файлов с точкой в имени
  // (robots.txt, sitemap.xml, favicon.ico, статика) — им локаль не нужна.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
