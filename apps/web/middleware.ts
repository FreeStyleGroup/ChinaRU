import createMiddleware from 'next-intl/middleware';

import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Применяем ко всем путям, кроме статики, API и файлов с расширением.
  matcher: ['/', '/(ru|en|zh)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
