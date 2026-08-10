'use client';

import { useLang } from './language-provider';
import type { Locale } from '@/lib/i18n/config';

const OPTIONS: { locale: Locale; flag: string; label: string }[] = [
  { locale: 'en', flag: '🇬🇧', label: 'English' },
  { locale: 'es', flag: '🇪🇸', label: 'Español' },
];

export function LanguageToggle({
  className = '',
  // Default is the coming-soon size (mobile reduced 25%); the nav passes its own.
  sizeClass = 'text-[1.6875rem] sm:text-[2.75rem]',
}: {
  className?: string;
  sizeClass?: string;
}) {
  const { locale, setLocale } = useLang();

  return (
    <div
      className={`inline-flex items-center border border-white-20 ${className}`}
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((opt) => {
        const active = opt.locale === locale;
        return (
          <button
            key={opt.locale}
            type="button"
            onClick={() => setLocale(opt.locale)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            className={`px-2 py-1 leading-none transition-colors ${sizeClass} ${
              active ? 'bg-gold/20' : 'opacity-50 hover:opacity-100'
            }`}
          >
            <span aria-hidden>{opt.flag}</span>
          </button>
        );
      })}
    </div>
  );
}
