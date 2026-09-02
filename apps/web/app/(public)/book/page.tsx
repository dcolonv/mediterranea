import Link from 'next/link';
import Image from 'next/image';
import { BookingFlow } from '@/components/booking/booking-flow';
import { LanguageToggle } from '@/components/i18n/language-toggle';
import { getBookingServices, getPublicPolicy } from '@/actions/public-booking';
import { getCurrentCustomer } from '@/lib/auth/customer';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Book an Appointment | Mediterránea Face Studio',
  description: 'Pre-book your treatment online — choose a service, practitioner, and time.',
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; group?: string }>;
}) {
  const { service: serviceSlug, group } = await searchParams;
  const [services, policy, customer, { dict }] = await Promise.all([
    getBookingServices(),
    getPublicPolicy(),
    getCurrentCustomer(),
    getServerDictionary(),
  ]);
  // A specific service slug, or `?group=custom` resolving to the single Custom Facial.
  const initialService = serviceSlug
    ? (services.find((s) => s.slug === serviceSlug) ?? null)
    : group === 'custom'
      ? (services.find((s) => s.bookingGroup === 'custom') ?? null)
      : null;
  // Focus / INDIBA open straight into their submenu.
  const startGroup = group === 'focus' || group === 'indiba' ? group : undefined;
  const prefill = customer
    ? { name: customer.name, email: customer.email, phone: customer.phone }
    : null;

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-8 lg:px-8">
      {/* Standalone top bar (this page lives outside the /init header/footer). */}
      <div className="mx-auto mb-12 flex max-w-5xl items-center justify-between">
        <Link href="/" aria-label="Mediterránea Face Studio">
          <Image src="/logo_light.png" alt="Mediterránea Face Studio" width={110} height={50} priority />
        </Link>
        <LanguageToggle />
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">{dict.booking.eyebrow}</span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">
            {dict.booking.title}
          </h1>
        </div>

        <BookingFlow
          services={services}
          initialService={initialService}
          startGroup={startGroup}
          policyText={policy.policyText}
          businessHours={policy.businessHours}
          maxAdvanceDays={policy.maxAdvanceDays}
          blockedDates={policy.blockedDates}
          prefill={prefill}
        />
      </div>
    </section>
  );
}
