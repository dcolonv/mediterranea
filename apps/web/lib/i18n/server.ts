import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isCrawler,
  isLocale,
  preferredLocale,
  type Locale,
} from './config';
import { getDictionary, type Dictionary } from './dictionaries';

/**
 * The active locale (server components / actions): the language in the URL on
 * localized pages (passed on by the middleware), otherwise the visitor's
 * choice (cookie), otherwise their browser's language. Cached per request —
 * layouts, metadata and the page all ask.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const fromUrl = h.get(LOCALE_HEADER);
  if (isLocale(fromUrl)) return fromUrl;
  const chosen = c.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  if (isCrawler(h.get('user-agent'))) return DEFAULT_LOCALE;
  return preferredLocale(h.get('accept-language')) ?? DEFAULT_LOCALE;
});

/** The active dictionary for server components. */
export async function getServerDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await getLocale();
  return { locale, dict: getDictionary(locale) };
}
