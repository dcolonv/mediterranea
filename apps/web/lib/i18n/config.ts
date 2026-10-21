export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_COOKIE = 'locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Request header the middleware sets on pages whose URL names the language. */
export const LOCALE_HEADER = 'x-locale';

/**
 * Pages served in both languages, each at its own URL — Spanish at /treatments,
 * English at /en/treatments — so search engines can index and rank both. The
 * treatment pages (/treatments/<slug>) are localized too. Every other page
 * follows the visitor's language cookie. Keep the middleware matcher in step.
 */
export const LOCALIZED_PATHS: readonly string[] = ['/', '/treatments', '/book', '/gift-cards', '/blog'];
const TREATMENT_PAGE_PATH = /^\/treatments\/[a-z0-9-]+$/;

const EN_PREFIX = '/en';
const QUERY_OR_HASH = /[?#]/;
// Search engines, AI crawlers and link previews (WhatsApp, Facebook…).
const CRAWLER = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|lighthouse/i;

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'en' || value === 'es';
}

/**
 * The site language a browser asks for in its Accept-Language header:
 * whichever of English and Spanish it ranks higher ('de-DE,de;q=0.9,en;q=0.8'
 * → English), or null when it names neither.
 */
export function preferredLocale(acceptLanguage: string | null | undefined): Locale | null {
  let best: { locale: Locale; q: number } | null = null;
  for (const part of acceptLanguage?.split(',') ?? []) {
    const [tag, ...params] = part.split(';');
    const lang = tag.trim().toLowerCase().split('-')[0];
    if (!isLocale(lang)) continue;
    const weight = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const q = weight ? Number(weight.slice(2)) : 1;
    // Equal weights keep the browser's order, so only a higher one replaces.
    if (q > 0 && (!best || q > best.q)) best = { locale: lang, q };
  }
  return best?.locale ?? null;
}

/**
 * Crawlers and link previews always get the language of the URL: choosing for
 * them by Accept-Language could keep the Spanish pages out of search.
 */
export function isCrawler(userAgent: string | null | undefined): boolean {
  return CRAWLER.test(userAgent ?? '');
}

/** Whether a page (path without query or language prefix) has a URL per language. */
export function isLocalizedPath(path: string): boolean {
  return LOCALIZED_PATHS.includes(path) || TREATMENT_PAGE_PATH.test(path);
}

/**
 * A URL path split into the page and the language the URL names:
 * '/en/book' → '/book' in English, '/book' → Spanish, '/account' → none.
 */
export function splitLocalePath(pathname: string): { path: string; locale: Locale | null } {
  if (pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`)) {
    return { path: pathname.slice(EN_PREFIX.length) || '/', locale: 'en' };
  }
  return { path: pathname, locale: isLocalizedPath(pathname) ? DEFAULT_LOCALE : null };
}

/**
 * The link to `href` for a reader in `locale`: '/book?group=x' → '/en/book?group=x'
 * in English. Pages that aren't localized come back unchanged.
 */
export function localizePath(href: string, locale: Locale): string {
  const end = href.search(QUERY_OR_HASH);
  const path = end === -1 ? href : href.slice(0, end);
  if (locale === DEFAULT_LOCALE || !isLocalizedPath(path)) return href;
  return (path === '/' ? EN_PREFIX : EN_PREFIX + path) + (end === -1 ? '' : href.slice(end));
}
