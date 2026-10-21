import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_HEADER,
  isCrawler,
  isLocale,
  isLocalizedPath,
  localizePath,
  preferredLocale,
  splitLocalePath,
  type Locale,
} from '@/lib/i18n/config';

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

  // Customer account area — requires the customer session cookie. The auth
  // pages themselves live under /account, so they must stay reachable.
  const CUSTOMER_AUTH = ['/account/login', '/account/signup', '/account/reset'];
  if (pathname.startsWith('/account') && !CUSTOMER_AUTH.some((p) => pathname.startsWith(p))) {
    const session = request.cookies.get('__customer');
    if (!session) {
      const loginUrl = new URL('/account/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Localized pages: /en/treatments serves the /treatments page in English.
  const { path, locale } = splitLocalePath(pathname);
  if (locale === 'en') {
    const url = request.nextUrl.clone();
    url.pathname = path;
    // Only some pages have an English URL; the rest follow the cookie.
    if (!isLocalizedPath(path)) return NextResponse.redirect(url);

    const response = NextResponse.rewrite(url, { request: { headers: withLocale(request, 'en') } });
    // Arriving in English (say, from a search result): remember it, so pages
    // without a language in the URL — account, emails — follow.
    if (!request.cookies.has(LOCALE_COOKIE)) {
      response.cookies.set(LOCALE_COOKIE, 'en', {
        path: '/',
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: 'lax',
      });
    }
    return response;
  }
  if (locale === 'es') {
    if (request.method === 'GET' && wantsEnglish(request)) {
      const url = request.nextUrl.clone();
      url.pathname = localizePath(path, 'en');
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers: withLocale(request, 'es') } });
  }

  return NextResponse.next();
}

/**
 * Whether to send this visitor from a Spanish URL to the English one: they
 * chose English, or it's their first visit and their browser prefers English.
 * Crawlers are never redirected, so search engines see the Spanish pages.
 */
function wantsEnglish(request: NextRequest): boolean {
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen === 'en';
  if (isCrawler(request.headers.get('user-agent'))) return false;
  return preferredLocale(request.headers.get('accept-language')) === 'en';
}

/** The request's headers, telling the page which language its URL names. */
function withLocale(request: NextRequest, locale: Locale): Headers {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return headers;
}

export const config = {
  // The localized pages (isLocalizedPath), which a matcher can't import.
  matcher: [
    '/backoffice/:path*',
    '/account/:path*',
    '/',
    '/en',
    '/en/:path*',
    '/treatments',
    '/treatments/:slug',
    '/book',
    '/gift-cards',
    '/blog',
  ],
};
