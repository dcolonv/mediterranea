import Link from 'next/link';
import { Button, PriceTag } from '@/components/ui';
import { getBookingServices } from '@/actions/public-booking';
import { getServerDictionary } from '@/lib/i18n/server';
import { durationLabel } from '@/lib/i18n/duration';
import { serviceName, serviceDescription } from '@/lib/i18n/service';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Treatments | Mediterránea Face Studio',
  description:
    'Our facial formats — 1.5 Hour, 45 Minutes and INDIBA — our seasonal facials, and the technology and products behind every treatment.',
};

export default async function TreatmentsPage() {
  const [services, { locale, dict }] = await Promise.all([
    getBookingServices(),
    getServerDictionary(),
  ]);
  const s = dict.services;
  const ft = dict.facialTreatments;
  const b = dict.booking;
  const t = dict.technology;
  const p = dict.products;

  const groupPricing = (group: string) => {
    const inGroup = services.filter((sv) => sv.bookingGroup === group);
    if (!inGroup.length) return null;
    const prices = inGroup.map((sv) => sv.price);
    return {
      regular: Math.min(...prices),
      first: Math.min(...inGroup.map((sv) => sv.firstVisitPrice || sv.price)),
      // "from" only earns its place when the group spans more than one price.
      varies: Math.min(...prices) !== Math.max(...prices),
    };
  };

  const customPricing = groupPricing('custom');
  const indibaPricing = groupPricing('indiba');
  const focusPricing = groupPricing('focus');

  interface Card {
    name: string;
    duration: string;
    description: string;
    pricing: { regular: number; first: number } | null;
    from: boolean;
    badge?: string;
    href: string;
  }

  // The three permanent formats.
  const formats: Card[] = [
    {
      name: s.customName,
      duration: s.customDuration,
      description: s.customDesc,
      pricing: customPricing,
      from: customPricing?.varies ?? false,
      href: '/book?group=custom',
    },
    {
      name: s.indibaName,
      duration: s.indibaDuration,
      description: s.indibaDesc,
      pricing: indibaPricing,
      from: indibaPricing?.varies ?? false,
      href: '/book?group=indiba',
    },
    {
      name: s.focusName,
      duration: s.focusDuration,
      description: s.focusDesc,
      pricing: focusPricing,
      from: focusPricing?.varies ?? false,
      href: '/book?group=focus',
    },
  ];

  // Standalone treatments (no booking group) book directly — currently the
  // seasonal facials, which lead the grid but are only on the page while they
  // run.
  const seasonal: Card[] = services
    .filter((sv) => !sv.bookingGroup)
    .map((sv) => ({
      name: serviceName(sv, locale),
      duration: durationLabel(sv.durationMinutes, locale),
      description: serviceDescription(sv, locale),
      pricing: { regular: sv.price, first: sv.firstVisitPrice || sv.price },
      from: false,
      badge: sv.temporary ? s.seasonal : undefined,
      href: `/book?service=${sv.slug}`,
    }));

  const cards = [...seasonal, ...formats];

  const card = (c: Card) => (
    <div
      key={c.name}
      className="group flex h-full flex-col border border-white-10 bg-dark-800/40 p-8 transition-all duration-500 hover:border-gold/30 hover:bg-dark-800/70"
    >
      <div className="mb-4 flex items-center text-xs uppercase tracking-wider text-white-30">
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {c.duration}
        {c.badge && (
          <span className="ml-auto border border-gold/40 px-2 py-0.5 text-[10px] tracking-wider text-gold">
            {c.badge}
          </span>
        )}
      </div>
      <div className="mb-4 flex flex-col gap-2">
        <h2 className="font-serif text-2xl leading-snug text-white transition-colors duration-300 group-hover:text-gold">
          {c.name}
        </h2>
        {c.pricing && (
          <PriceTag
            price={c.pricing.regular}
            firstPrice={c.pricing.first}
            from={c.from}
            fromLabel={b.from}
            firstLabel={s.firstVisit}
            className="text-left"
          />
        )}
      </div>
      <p className="flex-1 text-sm font-light leading-relaxed text-white-50">{c.description}</p>
      <Link href={c.href} className="mt-8">
        <Button variant="elegant" size="sm" className="w-full">
          {dict.treatments.book}
        </Button>
      </Link>
    </div>
  );

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* The facial formats, plus any standalone/seasonal facials */}
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
              {s.eyebrow}
            </span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">
            {seasonal.length ? s.allTitle : s.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white-50">
            {seasonal.length ? s.allSubtitle : s.subtitle}
          </p>
        </div>

        {/* Two columns while a seasonal facial makes four cards; back to three
            across once it ends and only the permanent formats remain. */}
        <div className={`grid gap-6 ${cards.length % 2 === 0 ? 'sm:grid-cols-2' : 'md:grid-cols-3'}`}>
          {cards.map(card)}
        </div>

        {/* What each facial does */}
        <div className="mt-28">
          <div className="mb-14 text-center">
            <div className="mb-6 flex items-center justify-center gap-5">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
              <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
                {ft.eyebrow}
              </span>
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
            </div>
            <h2 className="font-serif text-3xl tracking-wide text-white sm:text-4xl">{ft.title}</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white-50">{ft.subtitle}</p>
          </div>

          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {ft.items.map((item) => (
              <div key={item.name} className="border-l border-gold/30 pl-5">
                <h3 className="font-serif text-lg text-white">{item.name}</h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-white-50">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Treatment technology */}
        <div className="mt-28">
          <div className="mb-14 text-center">
            <div className="mb-6 flex items-center justify-center gap-5">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
              <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
                {t.eyebrow}
              </span>
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
            </div>
            <h2 className="font-serif text-3xl tracking-wide text-white sm:text-4xl">{t.title}</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white-50">{t.subtitle}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.items.map((item, i) => (
              <div
                key={item.name}
                className="group flex h-full flex-col border border-white-10 bg-dark-800/40 p-8 transition-all duration-500 hover:border-gold/30 hover:bg-dark-800/70"
              >
                <span className="mb-5 font-serif text-2xl text-gold/40 transition-colors duration-500 group-hover:text-gold/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-serif text-xl leading-snug text-white transition-colors duration-300 group-hover:text-gold">
                  {item.name}
                </h3>
                <p className="mt-3 flex-1 text-sm font-light leading-relaxed text-white-50">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Products we work with */}
        <div className="mt-28">
          <div className="mb-14 text-center">
            <div className="mb-6 flex items-center justify-center gap-5">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
              <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
                {p.eyebrow}
              </span>
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
            </div>
            <h2 className="font-serif text-3xl tracking-wide text-white sm:text-4xl">{p.title}</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white-50">{p.subtitle}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {p.items.map((brand) => (
              <a
                key={brand.name}
                href={brand.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col border border-white-10 bg-dark-800/40 p-8 transition-all duration-500 hover:border-gold/30 hover:bg-dark-800/70"
              >
                <h3 className="font-serif text-2xl text-white transition-colors duration-300 group-hover:text-gold">
                  {brand.name}
                </h3>
                <p className="mt-3 flex-1 text-sm font-light leading-relaxed text-white-50">
                  {brand.description}
                </p>
                <span className="mt-6 inline-flex items-center gap-1 text-xs uppercase tracking-wider text-gold/70 transition-colors group-hover:text-gold">
                  {p.visit}
                  <span aria-hidden>↗</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link href="/book">
            <Button variant="elegant" size="lg">
              {dict.services.cta}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
