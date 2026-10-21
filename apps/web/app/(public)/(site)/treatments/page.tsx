import Link from 'next/link';
import { Button } from '@/components/ui';
import {
  TREATMENT_CARD_FRAME,
  TreatmentCardBody,
  treatmentCardContents,
  type TreatmentCardContent,
} from '@/components/treatments/treatment-card';
import { getBookingServices } from '@/actions/public-booking';
import { spanIfLoneLast } from '@/lib/booking/treatment-cards';
import { getServerDictionary } from '@/lib/i18n/server';
import { localizePath } from '@/lib/i18n/config';
import { localizedMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const generateMetadata = () => localizedMetadata('/treatments', 'treatments');

export default async function TreatmentsPage() {
  const [services, { locale, dict }] = await Promise.all([
    getBookingServices(),
    getServerDictionary(),
  ]);
  const s = dict.services;
  const ft = dict.facialTreatments;
  const t = dict.technology;
  const p = dict.products;

  const cards = treatmentCardContents(services, locale, dict);
  const hasSeasonal = services.some((sv) => !sv.bookingGroup && sv.temporary);

  const card = (c: TreatmentCardContent, i: number) => (
    <div key={c.name} className={`${TREATMENT_CARD_FRAME} ${spanIfLoneLast(i, cards.length)}`}>
      <TreatmentCardBody card={c} dict={dict} />
      {c.details && (
        <Link
          href={localizePath(c.details, locale)}
          className="mt-6 text-xs uppercase tracking-wider text-gold/70 transition-colors hover:text-gold"
        >
          {dict.treatments.details} →
        </Link>
      )}
      <Link href={localizePath(c.href, locale)} className="mt-8">
        <Button variant="elegant" size="sm" className="w-full">
          {dict.treatments.book}
        </Button>
      </Link>
    </div>
  );

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* The facial formats, plus any standalone or seasonal treatments */}
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
              {s.eyebrow}
            </span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">
            {/* "Three ways…" only holds while there are exactly three cards. */}
            {cards.length === 3 ? s.title : s.allTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white-50">
            {hasSeasonal ? s.allSubtitle : s.subtitle}
          </p>
        </div>

        {/* Two columns; an odd last card spans both. */}
        <div className="grid gap-6 sm:grid-cols-2">
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
              <div key={item.name} className="min-w-0 border-l border-gold/30 pl-5">
                <h3 className="font-serif text-lg text-white">
                  <Link href={localizePath(`/treatments/${item.page}`, locale)} className="transition-colors hover:text-gold">
                    {item.name}
                  </Link>
                </h3>
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
                className="group flex h-full min-w-0 flex-col border border-white-10 bg-dark-800/40 p-6 transition-all duration-500 hover:border-gold/30 hover:bg-dark-800/70 sm:p-8"
              >
                <span className="mb-5 font-serif text-2xl text-gold/40 transition-colors duration-500 group-hover:text-gold/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-serif text-xl leading-snug break-words text-white transition-colors duration-300 group-hover:text-gold">
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
                className="group flex h-full min-w-0 flex-col border border-white-10 bg-dark-800/40 p-6 transition-all duration-500 hover:border-gold/30 hover:bg-dark-800/70 sm:p-8"
              >
                <h3 className="font-serif text-2xl break-words text-white transition-colors duration-300 group-hover:text-gold">
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
          <Link href={localizePath('/book', locale)}>
            <Button variant="elegant" size="lg">
              {dict.services.cta}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
