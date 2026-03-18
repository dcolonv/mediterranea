import { AppointmentForm } from '@/components/appointments';

export const metadata = {
  title: 'Book an Appointment | Mediterranea Skin Lab',
  description: 'Schedule your skincare appointment at Mediterranea Skin Lab.',
};

export default function AppointmentsPage() {
  return (
    <section className="relative min-h-screen bg-dark-900 pt-32 pb-24 overflow-hidden grain-texture">
      {/* Atmospheric gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_0%_50%,rgba(201,169,110,0.05),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_100%_30%,rgba(255,255,255,0.01),transparent)]" />

      {/* Decorative vertical lines */}
      <div className="absolute top-0 left-[15%] w-px h-full bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
      <div className="absolute top-0 right-[15%] w-px h-full bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />

      <div className="relative z-10 mx-auto max-w-2xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] tracking-[0.4em] text-gold/70 uppercase font-light">
              Reservation
            </span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wide text-white">
            Book Your Appointment
          </h1>
          <p className="mt-6 text-lg text-white-50 font-light">
            Select your preferred service, date, and time. We&apos;ll confirm
            your appointment shortly.
          </p>
        </div>

        {/* Form container */}
        <div className="border border-white-10 bg-dark-800/50 p-8 sm:p-12">
          <AppointmentForm />
        </div>
      </div>
    </section>
  );
}
