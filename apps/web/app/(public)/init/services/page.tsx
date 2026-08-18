import Link from 'next/link';
import { Button } from '@/components/ui';
import { formatPrice } from '@mediterranea/shared/utils';
import { getBookingServices } from '@/actions/public-booking';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Services | Mediterránea Face Studio',
  description: 'Our three facial formats: Custom, Focus and INDIBA. Book yours online.',
};

export default async function ServicesPage() {
  const [services, { dict }] = await Promise.all([getBookingServices(), getServerDictionary()]);
  const s = dict.services;
  const ft = dict.facialTreatments;

  const b = dict.booking;

  const priceOf = (group: string) => {
    const inGroup = services.filter((sv) => sv.bookingGroup === group).map((sv) => sv.price);
    return inGroup.length ? Math.min(...inGroup) : null;
  };
  const customPrice = priceOf('custom');
  const focusPrice = priceOf('focus');
  const indibaPrice = priceOf('indiba');

  const cards = [
    {
      name: s.customName,
      duration: s.customDuration,
      description: s.customDesc,
      price: customPrice === null ? '' : formatPrice(customPrice),
      href: '/book?group=custom',
    },
    {
      name: s.focusName,
      duration: s.focusDuration,
      description: s.focusDesc,
      price: focusPrice === null ? '' : `${b.from} ${formatPrice(focusPrice)}`,
      href: '/book?group=focus',
    },
    {
      name: s.indibaName,
      duration: s.indibaDuration,
      description: s.indibaDesc,
      price: indibaPrice === null ? '' : `${b.from} ${formatPrice(indibaPrice)}`,
      href: '/book?group=indiba',
    },
  ];

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
              {s.eyebrow}
            </span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">{s.title}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white-50">{s.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.name}
              className="group flex h-full flex-col border border-white-10 bg-dark-800/40 p-8 transition-all duration-500 hover:border-gold/30 hover:bg-dark-800/70"
            >
              <div className="mb-4 flex items-center text-xs uppercase tracking-wider text-white-30">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {card.duration}
              </div>
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="font-serif text-2xl text-white transition-colors duration-300 group-hover:text-gold">
                  {card.name}
                </h2>
                {card.price && <span className="shrink-0 text-gold">{card.price}</span>}
              </div>
              <p className="flex-1 text-sm font-light leading-relaxed text-white-50">{card.description}</p>
              <Link href={card.href} className="mt-8">
                <Button variant="elegant" size="sm" className="w-full">
                  {dict.treatments.book}
                </Button>
              </Link>
            </div>
          ))}
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
      </div>
    </section>
  );
}
