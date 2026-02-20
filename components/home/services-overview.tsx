import Link from 'next/link';
import { Button } from '@/components/ui';
import { ScrollReveal } from './scroll-reveal';
import { SERVICES_SEED } from '@/lib/constants';
import { formatPrice, formatDuration } from '@/lib/utils';

function ServiceCard({
  service,
  delay,
}: {
  service: (typeof SERVICES_SEED)[number];
  delay: number;
}) {
  return (
    <ScrollReveal delay={delay} className="h-full">
      <div className="group card-shine card-gold-line border border-white-10 bg-dark-700/30 p-8 transition-all duration-500 hover:border-gold/30 hover:bg-dark-700/60 h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <h4 className="font-serif text-xl text-white group-hover:text-gold transition-colors duration-300">
            {service.name}
          </h4>
          <span className="text-gold font-medium text-lg ml-4 shrink-0">
            {formatPrice(service.price)}
          </span>
        </div>
        <p className="text-sm text-white-50 leading-relaxed mb-6 font-light flex-1">
          {service.description}
        </p>
        <div className="flex items-center text-xs text-white-30 tracking-wider uppercase">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {formatDuration(service.durationMinutes)}
        </div>
      </div>
    </ScrollReveal>
  );
}

export function ServicesOverview() {
  const facials = SERVICES_SEED.filter((s) => s.category === 'facial');
  const treatments = SERVICES_SEED.filter((s) => s.category === 'treatment');

  return (
    <section
      id="services"
      className="relative bg-dark-800 py-32 grain-texture overflow-hidden"
    >
      {/* Atmospheric gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_100%,rgba(201,169,110,0.04),transparent)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-24">
            <div className="section-divider mb-6">
              <span className="text-[11px] tracking-[0.4em] text-gold/70 uppercase font-light">
                What We Offer
              </span>
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-wide text-white">
              Our Services
            </h2>
            <p className="mt-8 text-lg text-white-50 max-w-2xl mx-auto font-light leading-relaxed">
              Tailored skincare solutions designed to enhance your natural beauty
            </p>
          </div>
        </ScrollReveal>

        {/* Facials */}
        <div className="mb-24">
          <ScrollReveal>
            <h3 className="font-serif text-2xl text-white mb-12 text-center sm:text-left tracking-wider">
              Facial Treatments
            </h3>
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {facials.map((service, index) => (
              <ServiceCard
                key={service.slug}
                service={service}
                delay={index * 100}
              />
            ))}
          </div>
        </div>

        {/* Treatments */}
        <div className="mb-20">
          <ScrollReveal>
            <h3 className="font-serif text-2xl text-white mb-12 text-center sm:text-left tracking-wider">
              Advanced Treatments
            </h3>
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {treatments.map((service, index) => (
              <ServiceCard
                key={service.slug}
                service={service}
                delay={index * 100}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <ScrollReveal>
          <div className="text-center pt-4">
            <Link href="/appointments">
              <Button variant="elegant" size="lg">
                Book Your Appointment
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
