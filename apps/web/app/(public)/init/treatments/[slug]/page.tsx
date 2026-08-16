import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui';
import { formatPrice, formatDuration } from '@mediterranea/shared/utils';
import { getBookingService } from '@/actions/public-booking';
import { getServerDictionary } from '@/lib/i18n/server';
import { serviceName, serviceDescription } from '@/lib/i18n/service';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getBookingService(slug);
  return {
    title: service ? `${service.name} | Mediterránea Face Studio` : 'Treatment | Mediterránea Face Studio',
    description: service?.description,
  };
}

export default async function TreatmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [service, { locale, dict }] = await Promise.all([
    getBookingService(slug),
    getServerDictionary(),
  ]);
  if (!service) notFound();

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/init/treatments"
          className="text-sm text-white-50 transition-colors hover:text-white"
        >
          ‹ {dict.treatmentDetail.back}
        </Link>

        <div className="mt-8">
          <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
            {service.category}
          </span>
          <h1 className="mt-3 font-serif text-4xl tracking-wide text-white sm:text-5xl">
            {serviceName(service, locale)}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-6 text-white-70">
            <span className="text-2xl font-medium text-gold">{formatPrice(service.price)}</span>
            <span className="flex items-center text-sm uppercase tracking-wider text-white-30">
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(service.durationMinutes)}
            </span>
          </div>

          <p className="mt-10 whitespace-pre-wrap text-lg font-light leading-relaxed text-white-70">
            {serviceDescription(service, locale)}
          </p>

          <div className="mt-12 border-t border-white-10 pt-10">
            <Link href={`/init/book?service=${service.slug}`}>
              <Button variant="elegant" size="lg">
                {dict.treatmentDetail.book}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
