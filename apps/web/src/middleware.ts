import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow protected page and public assets
  if (pathname === '/protected' || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check for protected access cookie
  const hasAccess = request.cookies.get('protected-access')?.value === 'true';

  if (!hasAccess && pathname !== '/') {
    return NextResponse.redirect(new URL('/protected', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
