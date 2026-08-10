'use client';

import { useLang } from './language-provider';
import type { Locale } from '@/lib/i18n/config';

const FLAG: Record<Locale, string> = { en: '🇬🇧', es: '🇪🇸' };

export function LanguageToggle({
  className = '',
  // Default is the coming-soon size; the nav passes a 25%-smaller class.
  sizeClass = 'text-[2.25rem] sm:text-[2.75rem]',
}: {
  className?: string;
  sizeClass?: string;
}) {
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
      className={`inline-flex items-center justify-center leading-none transition-transform hover:scale-110 ${sizeClass} ${className}`}
    >
      <span aria-hidden>{FLAG[target]}</span>
    </button>
  );
}
