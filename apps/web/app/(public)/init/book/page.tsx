import { BookingFlow } from '@/components/booking/booking-flow';
import { getBookingServices, getPublicPolicy } from '@/actions/public-booking';
import { getCurrentCustomer } from '@/lib/auth/customer';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Book an Appointment | Mediterránea Face Studio',
  description: 'Book your treatment online — choose a service, practitioner, and time.',
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service: serviceSlug } = await searchParams;
  const [services, policy, customer, { dict }] = await Promise.all([
    getBookingServices(),
    getPublicPolicy(),
    getCurrentCustomer(),
    getServerDictionary(),
  ]);
  const initialService = serviceSlug
    ? (services.find((s) => s.slug === serviceSlug) ?? null)
    : null;
  const prefill = customer
    ? { name: customer.name, email: customer.email, phone: customer.phone }
    : null;

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
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
          policyText={policy.policyText}
          businessHours={policy.businessHours}
          maxAdvanceDays={policy.maxAdvanceDays}
          prefill={prefill}
        />
      </div>
    </section>
  );
}
