import { PriceTag } from '@/components/ui';
import type { PublicService } from '@/actions/public-booking';
import { treatmentCards } from '@/lib/booking/treatment-cards';
import { treatmentPageForGroup, treatmentPageForService } from '@/lib/booking/treatment-pages';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { durationLabel } from '@/lib/i18n/duration';
import { serviceName, serviceDescription } from '@/lib/i18n/service';

/** One card on the treatments and home pages: a single treatment or a facial format. */
export interface TreatmentCardContent {
  name: string;
  duration: string;
  description: string;
  pricing: { regular: number; first: number } | null;
  from: boolean;
  badge?: string;
  /** Where booking it starts. */
  href: string;
  /** The treatment's own page, when it has one. */
  details?: string;
}

/** The card's frame; a page adds what it needs around it (grid span, link). */
export const TREATMENT_CARD_FRAME =
  'group flex h-full min-w-0 flex-col border border-white-10 bg-dark-800/40 p-6 transition-all duration-500 hover:border-gold/30 hover:bg-dark-800/70 sm:p-8';

const pagePath = (page: { slug: string } | undefined) => page && `/treatments/${page.slug}`;

/** The card for a single treatment, which books directly. */
export function serviceCardContent(sv: PublicService, locale: Locale, dict: Dictionary): TreatmentCardContent {
  return {
    name: serviceName(sv, locale),
    duration: sv.bundleSessions
      ? dict.booking.passHint(sv.bundleSessions, durationLabel(sv.durationMinutes, locale))
      : durationLabel(sv.durationMinutes, locale),
    description: serviceDescription(sv, locale),
    pricing: { regular: sv.price, first: sv.firstVisitPrice || sv.price },
    from: false,
    badge: sv.temporary ? dict.services.seasonal : undefined,
    href: `/book?service=${sv.slug}`,
    details: pagePath(treatmentPageForService(sv.slug)),
  };
}

/**
 * The cards for these services, in catalogue order, as on the booking page: a
 * format (booking group) sits where its first treatment does, and a group with
 * no active treatments has no card. Standalone treatments — seasonal facials,
 * or ones taken out of a group — book directly.
 */
export function treatmentCardContents(
  services: PublicService[],
  locale: Locale,
  dict: Dictionary
): TreatmentCardContent[] {
  const s = dict.services;

  // A card's price: the lowest price (and intro price) among its treatments.
  const pricingOf = (list: PublicService[]) => {
    const prices = list.map((sv) => sv.price);
    return {
      regular: Math.min(...prices),
      first: Math.min(...list.map((sv) => sv.firstVisitPrice || sv.price)),
      // "from" only earns its place when the group spans more than one price.
      varies: Math.min(...prices) !== Math.max(...prices),
    };
  };

  const formatCopy = {
    custom: { name: s.customName, duration: s.customDuration, description: s.customDesc },
    focus: { name: s.focusName, duration: s.focusDuration, description: s.focusDesc },
    indiba: { name: s.indibaName, duration: s.indibaDuration, description: s.indibaDesc },
  };

  return treatmentCards(services).map((c) => {
    if (c.kind === 'service') return serviceCardContent(c.service, locale, dict);
    const pricing = pricingOf(c.services);
    return {
      ...formatCopy[c.group],
      pricing,
      from: pricing.varies,
      href: `/book?group=${c.group}`,
      details: pagePath(treatmentPageForGroup(c.group)),
    };
  });
}

/** What a card shows: duration (and seasonal badge), name, price and description. */
export function TreatmentCardBody({
  card,
  dict,
  heading: Heading = 'h2',
}: {
  card: TreatmentCardContent;
  dict: Dictionary;
  heading?: 'h2' | 'h3';
}) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-y-2 text-xs uppercase tracking-wider text-white-30">
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {card.duration}
        {card.badge && (
          <span className="ml-auto border border-gold/40 px-2 py-0.5 text-[10px] tracking-wider text-gold">
            {card.badge}
          </span>
        )}
      </div>
      <div className="mb-4 flex flex-col gap-2">
        <Heading className="font-serif text-2xl leading-snug break-words text-white transition-colors duration-300 group-hover:text-gold">
          {card.name}
        </Heading>
        {card.pricing && (
          <PriceTag
            price={card.pricing.regular}
            firstPrice={card.pricing.first}
            from={card.from}
            fromLabel={dict.booking.from}
            firstLabel={dict.services.firstVisit}
            className="text-left"
          />
        )}
      </div>
      <p className="flex-1 text-sm font-light leading-relaxed text-white-50">{card.description}</p>
    </>
  );
}
