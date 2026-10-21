'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  localizePath,
  splitLocalePath,
  type Locale,
} from '@/lib/i18n/config';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';

interface LanguageContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // The visitor's choice, for pages without a language in the URL.
  const [chosen, setChosen] = useState<Locale>(initialLocale);
  // A localized page is always in its URL's language — also after back/forward,
  // which this layout (and its state) survives.
  const { path, locale: urlLocale } = splitLocalePath(pathname);
  const locale = urlLocale ?? chosen;

  // The root layout renders <html lang> for the first page; keep it in step
  // across client navigations so screen readers and translation get it right.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: Locale) {
    if (next === locale) return;
    // Persist for a year so both server (cookie) and client stay in sync.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    setChosen(next);
    if (urlLocale) {
      // The same page at the other language's URL.
      router.push(localizePath(path, next) + window.location.search + window.location.hash);
    } else {
      // Re-render server components (data pages, service content) in the new locale.
      router.refresh();
    }
  }

  return (
    <LanguageContext.Provider value={{ locale, dict: getDictionary(locale), setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
}
