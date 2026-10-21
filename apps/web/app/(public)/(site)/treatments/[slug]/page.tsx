import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { CONTACT_INFO } from '@mediterranea/shared/constants';
import { Button, PriceTag } from '@/components/ui';
import { JsonLd } from '@/components/json-ld';
import {
  TREATMENT_CARD_FRAME,
  TreatmentCardBody,
  serviceCardContent,
} from '@/components/treatments/treatment-card';
import { getBookingServices, type PublicService } from '@/actions/public-booking';
import { TREATMENT_PAGES, treatmentPage, treatmentPageForService } from '@/lib/booking/treatment-pages';
import { spanIfLoneLast } from '@/lib/booking/treatment-cards';
import { localizePath } from '@/lib/i18n/config';
import { durationLabel } from '@/lib/i18n/duration';
import { getLocale, getServerDictionary } from '@/lib/i18n/server';
import { serviceName, serviceDescription } from '@/lib/i18n/service';
import { localizedAlternates, treatmentJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const [{ slug }, { locale, dict }] = await Promise.all([params, getServerDictionary()]);
  const page = treatmentPage(slug);
  if (!page) return {};
  const copy = dict.treatmentPages[page.slug];
  return {
    title: `${copy.title} | Mediterránea Face Studio`,
    description: copy.description,
    alternates: localizedAlternates(`/treatments/${page.slug}`, locale),
  };
}

export default async function TreatmentPage({ params }: Props) {
  const { slug } = await params;
  const page = treatmentPage(slug);
  if (!page) {
    // These URLs used to be per catalogue service; send those to their page.
    const owner = treatmentPageForService(slug);
    if (owner) permanentRedirect(localizePath(`/treatments/${owner.slug}`, await getLocale()));
    notFound();
  }

  const [catalogue, { locale, dict }] = await Promise.all([getBookingServices(), getServerDictionary()]);
  const bySlug = new Map(catalogue.map((s) => [s.slug, s]));
  const services = page.services.flatMap((s) => bySlug.get(s) ?? []);
  if (services.length === 0) notFound();

  const d = dict.treatmentDetail;
  const copy = dict.treatmentPages[page.slug];
  const path = `/treatments/${page.slug}`;
  const href = (p: string) => localizePath(p, locale);
  // Several options (INDIBA): each describes itself, under a lead about the
  // technology. The 45 minute format page leads with the format.
  const multiple = services.length > 1;
  const lead =
    page.kind === 'indiba'
      ? (dict.technology.items.find((t) => t.name === 'INDIBA')?.description ?? '')
      : page.kind === 'focusList'
        ? dict.services.focusDesc
        : serviceDescription(services[0], locale);

  const duration = (sv: PublicService) =>
    sv.bundleSessions
      ? dict.booking.passHint(sv.bundleSessions, durationLabel(sv.durationMinutes, locale))
      : durationLabel(sv.durationMinutes, locale);

  const sectionTitle = 'mb-6 font-serif text-2xl tracking-wide text-white sm:text-3xl';
  const body = 'text-base font-light leading-relaxed text-white-70';
  const link = 'text-gold underline underline-offset-2 hover:text-gold-light';

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <JsonLd
        data={treatmentJsonLd({ path, locale, name: copy.title, description: copy.description, services })}
      />
      <div className="mx-auto max-w-3xl">
        {/* Back to the home page's "Our ways to care for your skin". */}
        <Link href={href('/#services')} className="text-sm text-white-50 transition-colors hover:text-white">
          ‹ {d.back}
        </Link>

        <div className="mt-8">
          <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
            {d.eyebrow[page.kind]}
          </span>
          <h1 className="mt-3 font-serif text-4xl tracking-wide text-white sm:text-5xl">{copy.title}</h1>
          <p className="mt-8 text-lg font-light leading-relaxed text-white-70">{lead}</p>
        </div>

        {page.kind === 'focusList' ? (
          // One card per 45 minute facial, each leading to its own page.
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {services.map((sv, i) => {
              const card = serviceCardContent(sv, locale, dict);
              return (
                <Link
                  key={sv.id}
                  href={href(card.details ?? card.href)}
                  className={`${TREATMENT_CARD_FRAME} cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold ${spanIfLoneLast(i, services.length)}`}
                >
                  <TreatmentCardBody card={card} dict={dict} />
                </Link>
              );
            })}
          </div>
        ) : (
          // The bookable options, with live prices and durations.
          <div className="mt-12 space-y-4">
            {services.map((sv) => (
              <div key={sv.id} className="border border-white-10 bg-dark-800/40 p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-serif text-2xl leading-snug text-white">
                      {serviceName(sv, locale)}
                    </h2>
                    <p className="mt-2 flex items-center text-xs uppercase tracking-wider text-white-30">
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {duration(sv)}
                    </p>
                  </div>
                  <PriceTag
                    price={sv.price}
                    firstPrice={sv.firstVisitPrice}
                    firstLabel={dict.services.firstVisit}
                    className="text-right"
                  />
                </div>
                {multiple && (
                  <p className="mt-4 text-sm font-light leading-relaxed text-white-50">
                    {serviceDescription(sv, locale)}
                  </p>
                )}
                <Link href={href(`/book?service=${sv.slug}`)} className="mt-6 inline-block">
                  <Button variant="elegant" size="sm">
                    {d.book}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* How this format works, in the studio's own words (INDIBA has no such section) */}
        {page.kind !== 'indiba' && (
          <div className="mt-16">
            {(page.kind === 'focus' || page.kind === 'focusList') && (
              <>
                <h2 className={sectionTitle}>{d.aboutFocus}</h2>
                {page.kind === 'focus' && <p className={`mb-4 ${body}`}>{dict.services.focusDesc}</p>}
                <p className={body}>
                  {d.combine}{' '}
                  <Link href={href('/treatments/facial-personalizado')} className={link}>
                    {d.combineLink}
                  </Link>
                </p>
                {page.kind === 'focus' && (
                  <p className="mt-4">
                    <Link href={href('/treatments/facial-focus')} className={link}>
                      {d.allFocus}
                    </Link>
                  </p>
                )}
              </>
            )}
            {page.kind === 'seasonal' && (
              <>
                <h2 className={sectionTitle}>{d.aboutSeasonal}</h2>
                <p className={body}>{d.seasonalNote}</p>
              </>
            )}
            {page.kind === 'custom' && (
              <>
                <h2 className={sectionTitle}>{d.aboutCustom}</h2>
                <p className={body}>{dict.services.customDesc}</p>
                <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                  {dict.facialTreatments.items.map((item) => (
                    <li key={item.page} className="border-l border-gold/30 pl-5">
                      <Link href={href(`/treatments/${item.page}`)} className="font-serif text-lg text-white hover:text-gold">
                        {item.name}
                      </Link>
                      <p className="mt-2 text-sm font-light leading-relaxed text-white-50">{item.description}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="mt-16">
          <h2 className={sectionTitle}>{d.where}</h2>
          <p className={body}>{d.whereNote}</p>
          <p className={`mt-4 ${body}`}>
            {CONTACT_INFO.address}
            <br />
            {CONTACT_INFO.city}
          </p>
          <a
            href={CONTACT_INFO.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-gold underline underline-offset-2 hover:text-gold-light"
          >
            {d.map}
          </a>
        </div>

        <div className="mt-16 border-t border-white-10 pt-10">
          <h2 className={sectionTitle}>{d.related}</h2>
          <ul className="flex flex-wrap gap-3">
            {TREATMENT_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
              <li key={p.slug}>
                <Link
                  href={href(`/treatments/${p.slug}`)}
                  className="inline-block border border-white-10 px-4 py-2 text-sm text-white-70 transition-colors hover:border-gold/40 hover:text-white"
                >
                  {dict.treatmentPages[p.slug].name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
