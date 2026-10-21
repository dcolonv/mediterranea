/**
 * Treatment pages: one indexable page per treatment people search for —
 * "peeling facial Málaga", "facial INDIBA Málaga" — at /treatments/<slug>
 * (Spanish) and /en/treatments/<slug>. Each is built from the catalogue
 * services it lists, so names, prices and descriptions stay in step with the
 * backoffice; a page whose services are all inactive is a 404.
 */
import type { BookingGroup } from '@mediterranea/shared/types';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * custom, focus, indiba and seasonal pages offer their services to book;
 * focusList is the 45 minute format, linking to each of its treatments' pages.
 */
export type TreatmentPageKind = 'custom' | 'focus' | 'focusList' | 'indiba' | 'seasonal';

/** A page's slug is also the key of its copy in the dictionaries. */
export type TreatmentPageSlug = keyof Dictionary['treatmentPages'];

export interface TreatmentPage {
  slug: TreatmentPageSlug;
  kind: TreatmentPageKind;
  /** The catalogue services the page shows, by service slug, in order. */
  services: readonly string[];
  /** The booking group (format) the page presents as a whole, if any. */
  group?: BookingGroup;
}

export const TREATMENT_PAGES: readonly TreatmentPage[] = [
  { slug: 'facial-personalizado', kind: 'custom', services: ['custom-facial'], group: 'custom' },
  {
    slug: 'facial-focus',
    kind: 'focusList',
    group: 'focus',
    services: [
      'hidratacion-focalizado',
      'purificante-focalizado',
      'iluminador-focalizado',
      'tono-uniforme-focalizado',
      'lineas-firmeza-focalizado',
      'peeling-focalizado',
      'focus-help',
    ],
  },
  // The 45 minute facials, in the order the treatments page lists them.
  { slug: 'facial-hidratante', kind: 'focus', services: ['hidratacion-focalizado'] },
  { slug: 'facial-purificante', kind: 'focus', services: ['purificante-focalizado'] },
  { slug: 'facial-iluminador', kind: 'focus', services: ['iluminador-focalizado'] },
  { slug: 'tono-uniforme', kind: 'focus', services: ['tono-uniforme-focalizado'] },
  { slug: 'lineas-y-firmeza', kind: 'focus', services: ['lineas-firmeza-focalizado'] },
  { slug: 'peeling', kind: 'focus', services: ['peeling-focalizado'] },
  {
    slug: 'facial-indiba',
    kind: 'indiba',
    services: ['indiba-focus', 'indiba-full', 'indiba-5-sessions'],
  },
  { slug: 'bright-season-facial', kind: 'seasonal', services: ['bright-season-facial'] },
];

export function treatmentPage(slug: string): TreatmentPage | undefined {
  return TREATMENT_PAGES.find((p) => p.slug === slug);
}

/** The page about one catalogue service, if any (not the format pages listing several). */
export function treatmentPageForService(serviceSlug: string): TreatmentPage | undefined {
  return TREATMENT_PAGES.find((p) => p.kind !== 'focusList' && p.services.includes(serviceSlug));
}

/** The page presenting a booking group (format) as a whole, if any. */
export function treatmentPageForGroup(group: string): TreatmentPage | undefined {
  return TREATMENT_PAGES.find((p) => p.group === group);
}
