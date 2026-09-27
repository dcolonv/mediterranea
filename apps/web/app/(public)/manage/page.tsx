import Link from 'next/link';
import Image from 'next/image';
import { getManagedAppointment } from '@/actions/manage-appointment';
import { ManageAppointment } from './manage-appointment';
import { CONTACT_INFO } from '@mediterranea/shared/constants';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your appointment | Mediterránea Face Studio',
  // Never let a management page be indexed or its URL leaked onward.
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};

export default async function ManagePage() {
  const result = await getManagedAppointment();

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-10 lg:px-8">
      {/* Standalone bar: this page is reached from an email, not from the site. */}
      <div className="mx-auto mb-12 flex max-w-2xl items-center justify-center">
        <Link href="/" aria-label="Mediterránea Face Studio">
          <Image
            src="/logo_light.png"
            alt="Mediterránea Face Studio"
            width={110}
            height={50}
            priority
          />
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        {result.success ? (
          <ManageAppointment appointment={result.data} />
        ) : (
          <div className="border border-white-10 bg-dark-800 p-10 text-center">
            <h1 className="font-serif text-2xl text-white">This link isn’t valid</h1>
            <p className="mx-auto mt-4 max-w-md text-sm font-light leading-relaxed text-white-50">
              {result.error} Links expire once the appointment has passed. Please call or message
              us and we’ll sort it out.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
              <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`} className="text-gold hover:underline">
                {CONTACT_INFO.phone}
              </a>
              <a href={`mailto:${CONTACT_INFO.email}`} className="text-gold hover:underline">
                {CONTACT_INFO.email}
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
