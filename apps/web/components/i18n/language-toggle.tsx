'use client';

import { useLang } from './language-provider';
import type { Locale } from '@/lib/i18n/config';

const FLAG: Record<Locale, string> = { en: '🇬🇧', es: '🇪🇸' };

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, dict, setLocale } = useLang();

  // Single button showing the language you'll switch to.
  const target: Locale = locale === 'en' ? 'es' : 'en';
  const label = target === 'es' ? dict.lang.switchToSpanish : dict.lang.switchToEnglish;

  return (
    <button
      type="button"
      onClick={() => setLocale(target)}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center text-[2.25rem] sm:text-[2.75rem] leading-none transition-transform hover:scale-110 ${className}`}
    >
      <span aria-hidden>{FLAG[target]}</span>
    </button>
  );
}
