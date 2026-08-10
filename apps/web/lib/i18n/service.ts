import type { Locale } from './config';
import type { PublicService } from '@/actions/public-booking';

/** Localized service name — Spanish when available, English fallback. */
export function serviceName(s: Pick<PublicService, 'name' | 'nameEs'>, locale: Locale): string {
  return locale === 'es' && s.nameEs ? s.nameEs : s.name;
}

/** Localized service description — Spanish when available, English fallback. */
export function serviceDescription(
  s: Pick<PublicService, 'description' | 'descriptionEs'>,
  locale: Locale
): string {
  return locale === 'es' && s.descriptionEs ? s.descriptionEs : s.description;
}
