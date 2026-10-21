import type { Metadata } from 'next';
import { BUSINESS_HOURS, CONTACT_INFO } from '@mediterranea/shared/constants';
import type { PublicService } from '@/actions/public-booking';
import { localizePath, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getServerDictionary } from '@/lib/i18n/server';
import { serviceName, serviceDescription } from '@/lib/i18n/service';

/**
 * The public site's canonical origin. Canonical URLs, the sitemap and the
 * structured data always point here, so the bare domain (which redirects) and
 * preview deployments are never read as separate copies of the site.
 */
export const SITE_URL = 'https://www.mediterraneafacestudio.com';

export const SITE_NAME = 'Mediterránea Face Studio';

const BUSINESS_ID = `${SITE_URL}/#business`;

/** An absolute URL on the site; the home page without a trailing slash. */
export function absoluteUrl(path: string): string {
  return path === '/' ? SITE_URL : SITE_URL + path;
}

/**
 * Canonical URL and language versions of a localized page (LOCALIZED_PATHS):
 * each version is its own canonical and names the other, so Google shows
 * Spanish searchers /x and English searchers /en/x. Spanish is the default
 * for everyone else.
 */
export function localizedAlternates(path: string, locale: Locale): Metadata['alternates'] {
  return {
    canonical: localizePath(path, locale),
    languages: { es: path, en: localizePath(path, 'en'), 'x-default': path },
  };
}

type PageMeta = 'treatments' | 'book' | 'giftCards' | 'blog';

/** Title, description and language versions of a localized page, in its language. */
export async function localizedMetadata(path: string, page: PageMeta): Promise<Metadata> {
  const { locale, dict } = await getServerDictionary();
  return {
    title: dict.meta[`${page}Title` as const],
    description: dict.meta[`${page}Description` as const],
    alternates: localizedAlternates(path, locale),
  };
}

const WEEKDAY_NAMES: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

/**
 * The studio described in schema.org terms: the format Google and AI assistants
 * read for the business type, address, phone, hours and treatment menu — in
 * the page's language. It must agree with what the home page shows (Google
 * ignores markup that contradicts the visible content), so the hours come from
 * the same constant as the contact section.
 */
export function studioJsonLd(services: PublicService[], locale: Locale) {
  const { meta } = getDictionary(locale);

  // Days with the same hours share one OpeningHoursSpecification.
  const byHours = new Map<string, string[]>();
  for (const [day, hours] of Object.entries(BUSINESS_HOURS)) {
    if (!hours) continue;
    const key = `${hours.open}-${hours.close}`;
    byHours.set(key, [...(byHours.get(key) ?? []), WEEKDAY_NAMES[day]]);
  }

  // Single treatments only: a pass's price is for several sessions.
  const prices = services.filter((s) => !s.bundleSessions).map((s) => s.price);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BeautySalon',
        '@id': BUSINESS_ID,
        name: SITE_NAME,
        description: meta.business,
        url: SITE_URL,
        logo: `${SITE_URL}/logo_single.png`,
        image: [`${SITE_URL}/hero-studio-room.jpg`, `${SITE_URL}/og-image.png`],
        telephone: CONTACT_INFO.phone,
        email: CONTACT_INFO.email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: CONTACT_INFO.address,
          postalCode: CONTACT_INFO.postalCode,
          addressLocality: 'Málaga',
          addressCountry: 'ES',
        },
        geo: { '@type': 'GeoCoordinates', ...CONTACT_INFO.coordinates },
        hasMap: CONTACT_INFO.googleMapsUrl,
        areaServed: { '@type': 'City', name: 'Málaga' },
        openingHoursSpecification: [...byHours].map(([key, days]) => {
          const [opens, closes] = key.split('-');
          return { '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes };
        }),
        ...(prices.length > 0 && { priceRange: `${Math.min(...prices)}–${Math.max(...prices)} €` }),
        sameAs: [CONTACT_INFO.instagramUrl, CONTACT_INFO.googleMapsUrl],
        ...(services.length > 0 && {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: meta.catalog,
            itemListElement: services.map((s) => ({
              '@type': 'Offer',
              price: s.price,
              priceCurrency: 'EUR',
              itemOffered: {
                '@type': 'Service',
                name: serviceName(s, locale),
                description: serviceDescription(s, locale),
              },
            })),
          },
        }),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: ['es', 'en'],
        publisher: { '@id': BUSINESS_ID },
      },
    ],
  };
}

/**
 * A treatment page in schema.org terms: the service, who provides it and what
 * each option costs, plus the breadcrumb trail Google can show instead of the URL.
 */
export function treatmentJsonLd({
  path,
  locale,
  name,
  description,
  services,
}: {
  path: string;
  locale: Locale;
  name: string;
  description: string;
  services: PublicService[];
}) {
  const { nav, treatmentDetail } = getDictionary(locale);
  const url = absoluteUrl(localizePath(path, locale));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name,
        description,
        url,
        provider: { '@type': 'BeautySalon', '@id': BUSINESS_ID, name: SITE_NAME, url: SITE_URL },
        areaServed: { '@type': 'City', name: 'Málaga' },
        offers: services.map((s) => ({
          '@type': 'Offer',
          name: serviceName(s, locale),
          price: s.price,
          priceCurrency: 'EUR',
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { name: treatmentDetail.home, path: '/' },
          { name: nav.treatments, path: '/treatments' },
          { name, path },
        ].map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.name,
          item: absoluteUrl(localizePath(crumb.path, locale)),
        })),
      },
    ],
  };
}
