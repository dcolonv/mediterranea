import Link from 'next/link';
import { Button } from '@/components/ui';
import { formatPrice, formatDuration } from '@mediterranea/shared/utils';
import { getBookingServices, type PublicService } from '@/actions/public-booking';
import { getServerDictionary } from '@/lib/i18n/server';
import { serviceName, serviceDescription } from '@/lib/i18n/service';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

// Reads live services via the Admin SDK — render on demand, not at build.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Treatments | Mediterránea Face Studio',
  description: 'Explore our facials and advanced facial treatments.',
};

function ServiceCard({
  service,
  locale,
  dict,
}: {
  service: PublicService;
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <div className="group flex h-full flex-col border border-white-10 bg-dark-700/30 p-8 transition-all duration-500 hover:border-gold/30 hover:bg-dark-700/60">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="font-serif text-xl text-white transition-colors duration-300 group-hover:text-gold">
          {serviceName(service, locale)}
        </h3>
        <span className="ml-4 shrink-0 text-lg font-medium text-gold">
          {formatPrice(service.price)}
        </span>
      </div>
      <p className="mb-6 flex-1 text-sm font-light leading-relaxed text-white-50 line-clamp-3">
        {serviceDescription(service, locale)}
      </p>
      <div className="mb-6 flex items-center text-xs uppercase tracking-wider text-white-30">
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatDuration(service.durationMinutes)}
      </div>
      <div className="flex gap-3">
        <Link href={`/init/treatments/${service.slug}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            {dict.treatments.details}
          </Button>
        </Link>
        <Link href={`/init/book?service=${service.slug}`} className="flex-1">
          <Button variant="elegant" size="sm" className="w-full">
            {dict.treatments.book}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default async function TreatmentsPage() {
  const [services, { locale, dict }] = await Promise.all([
    getBookingServices(),
    getServerDictionary(),
  ]);
  const facials = services.filter((s) => s.category === 'facial');
  const treatments = services.filter((s) => s.category === 'treatment');

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
              {dict.treatments.eyebrow}
            </span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">
            {dict.treatments.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white-50">
            {dict.treatments.subtitle}
          </p>
        </div>

        {services.length === 0 ? (
          <p className="text-center text-white-50">{dict.treatments.comingSoon}</p>
        ) : (
          <div className="space-y-20">
            {facials.length > 0 && (
              <div>
                <h2 className="mb-10 font-serif text-2xl tracking-wider text-white">
                  {dict.treatments.facials}
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {facials.map((s) => (
                    <ServiceCard key={s.id} service={s} locale={locale} dict={dict} />
                  ))}
                </div>
              </div>
            )}
            {treatments.length > 0 && (
              <div>
                <h2 className="mb-10 font-serif text-2xl tracking-wider text-white">
                  {dict.treatments.advanced}
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {treatments.map((s) => (
                    <ServiceCard key={s.id} service={s} locale={locale} dict={dict} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
