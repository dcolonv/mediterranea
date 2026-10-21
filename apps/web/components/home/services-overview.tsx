import Link from 'next/link';
import { Button } from '@/components/ui';
import { ScrollReveal } from './scroll-reveal';
import {
  TREATMENT_CARD_FRAME,
  TreatmentCardBody,
  treatmentCardContents,
} from '@/components/treatments/treatment-card';
import { getCatalogue } from '@/lib/booking/catalogue';
import { localizePath } from '@/lib/i18n/config';
import { getServerDictionary } from '@/lib/i18n/server';

export async function ServicesOverview() {
  const [services, { locale, dict }] = await Promise.all([getCatalogue(), getServerDictionary()]);
  const s = dict.services;
  // The treatments page's cards, minus passes: a pack is bought for a series
  // of sessions, not chosen from the home page.
  const cards = treatmentCardContents(
    services.filter((sv) => !sv.bundleSessions),
    locale,
    dict
  );

  return (
    <section id="services" className="relative bg-dark-800 py-32 grain-texture overflow-hidden">
      {/* Atmospheric gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_100%,rgba(201,169,110,0.04),transparent)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-20">
            <div className="section-divider mb-6">
              <span className="text-[11px] tracking-[0.4em] text-gold uppercase font-semibold">
                {s.eyebrow}
              </span>
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-wide text-white">
              {s.title}
            </h2>
            <p className="mt-8 text-lg text-white-50 max-w-2xl mx-auto font-light leading-relaxed">
              {s.subtitle}
            </p>
          </div>
        </ScrollReveal>

        {/* Each card is one link: to the treatment's page when it has one,
            otherwise to booking it. Three columns on desktop, two on tablets;
            a short last row is centered, its cards the same width as above. */}
        <div className="flex flex-wrap justify-center gap-6">
          {cards.map((c, i) => (
            <ScrollReveal
              key={c.name}
              delay={(i % 3) * 120}
              className="w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
            >
              <Link
                href={localizePath(c.details ?? c.href, locale)}
                className={`${TREATMENT_CARD_FRAME} cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold`}
              >
                <TreatmentCardBody card={c} dict={dict} heading="h3" />
              </Link>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA */}
        <ScrollReveal>
          <div className="mt-16 text-center">
            <Link href={localizePath('/book', locale)}>
              <Button variant="elegant" size="lg">
                {s.cta}
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
