'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { ScrollReveal } from './scroll-reveal';
import { useLang } from '@/components/i18n/language-provider';
import { localizePath } from '@/lib/i18n/config';

function FacialCard({
  name,
  duration,
  description,
  details,
  detailsLabel,
  delay,
}: {
  name: string;
  duration: string;
  description: string;
  /** Where to read more about this format. */
  details: string;
  detailsLabel: string;
  delay: number;
}) {
  return (
    <ScrollReveal delay={delay} className="h-full">
      <div className="group card-shine card-gold-line flex h-full flex-col border border-white-10 bg-dark-700/30 p-10 transition-all duration-500 hover:border-gold/30 hover:bg-dark-700/60">
        <div className="mb-4 flex items-center text-xs uppercase tracking-wider text-white-30">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {duration}
        </div>
        <h4 className="mb-4 font-serif text-2xl text-white transition-colors duration-300 group-hover:text-gold">
          {name}
        </h4>
        <p className="flex-1 text-sm font-light leading-relaxed text-white-50">{description}</p>
        <Link
          href={details}
          className="mt-6 text-xs uppercase tracking-wider text-gold/70 transition-colors hover:text-gold"
        >
          {detailsLabel} →
        </Link>
      </div>
    </ScrollReveal>
  );
}

export function ServicesOverview() {
  const { dict, locale } = useLang();
  const s = dict.services;

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

        {/* The three facial formats */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FacialCard
            name={s.customName}
            duration={s.customDuration}
            description={s.customDesc}
            details={localizePath('/treatments/facial-personalizado', locale)}
            detailsLabel={dict.treatments.details}
            delay={0}
          />
          <FacialCard
            name={s.indibaName}
            duration={s.indibaDuration}
            description={s.indibaDesc}
            details={localizePath('/treatments/facial-indiba', locale)}
            detailsLabel={dict.treatments.details}
            delay={120}
          />
          {/* Six treatments share this format; the treatments page lists them. */}
          <FacialCard
            name={s.focusName}
            duration={s.focusDuration}
            description={s.focusDesc}
            details={localizePath('/treatments', locale)}
            detailsLabel={dict.treatments.details}
            delay={240}
          />
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
