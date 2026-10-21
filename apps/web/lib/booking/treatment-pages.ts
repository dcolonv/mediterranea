/**
 * Treatment pages: one indexable page per treatment people search for —
 * "peeling facial Málaga", "facial INDIBA Málaga" — at /treatments/<slug>
 * (Spanish) and /en/treatments/<slug>. Each is built from the catalogue
 * services it lists, so names, prices and descriptions stay in step with the
 * backoffice; a page whose services are all inactive is a 404.
 */
import type { Dictionary } from '@/lib/i18n/dictionaries';

export type TreatmentPageKind = 'custom' | 'focus' | 'indiba';

/** A page's slug is also the key of its copy in the dictionaries. */
export type TreatmentPageSlug = keyof Dictionary['treatmentPages'];

export interface TreatmentPage {
  slug: TreatmentPageSlug;
  kind: TreatmentPageKind;
  /** The catalogue services the page shows, by service slug, in order. */
  services: readonly string[];
}

export const TREATMENT_PAGES: readonly TreatmentPage[] = [
  { slug: 'facial-personalizado', kind: 'custom', services: ['custom-facial'] },
  {
    slug: 'facial-indiba',
    kind: 'indiba',
    services: ['indiba-focus', 'indiba-full', 'indiba-5-sessions'],
  },
  // The 45 minute facials, in the order the treatments page lists them.
  { slug: 'facial-hidratante', kind: 'focus', services: ['hidratacion-focalizado'] },
  { slug: 'facial-purificante', kind: 'focus', services: ['purificante-focalizado'] },
  { slug: 'facial-iluminador', kind: 'focus', services: ['iluminador-focalizado'] },
  { slug: 'tono-uniforme', kind: 'focus', services: ['tono-uniforme-focalizado'] },
  { slug: 'lineas-y-firmeza', kind: 'focus', services: ['lineas-firmeza-focalizado'] },
  { slug: 'peeling', kind: 'focus', services: ['peeling-focalizado'] },
];

export function treatmentPage(slug: string): TreatmentPage | undefined {
  return TREATMENT_PAGES.find((p) => p.slug === slug);
}

/** The page a catalogue service is shown on, if any. */
export function treatmentPageForService(serviceSlug: string): TreatmentPage | undefined {
  return TREATMENT_PAGES.find((p) => p.services.includes(serviceSlug));
}
