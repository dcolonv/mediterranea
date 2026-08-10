import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Backoffice (admin) area — requires the admin session cookie.
  if (pathname.startsWith('/backoffice')) {
    const session = request.cookies.get('__session');
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Customer account area — requires the customer session cookie.
  if (pathname.startsWith('/init/account')) {
    const session = request.cookies.get('__customer');
    if (!session) {
      const loginUrl = new URL('/init/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/backoffice/:path*', '/init/account/:path*'],
};
