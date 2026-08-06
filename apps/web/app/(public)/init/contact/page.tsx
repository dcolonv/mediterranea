import { CONTACT_INFO } from '@mediterranea/shared/constants';
import { getPublicPolicy } from '@/actions/public-booking';
import type { Weekday } from '@mediterranea/shared/types';

export const metadata = {
  title: 'Contact & Hours | Mediterránea Face Studio',
  description: 'Find us, our opening hours, and how to get in touch.',
};

const DAYS: { key: Weekday; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default async function ContactPage() {
  const { businessHours } = await getPublicPolicy();

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold/70">Visit Us</span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">Contact &amp; Hours</h1>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact */}
          <div className="border border-white-10 bg-dark-800/50 p-8">
            <h2 className="mb-6 font-serif text-xl text-white">Get in touch</h2>
            <dl className="space-y-5 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-white-30">Address</dt>
                <dd className="mt-1 leading-relaxed text-white-70">
                  {CONTACT_INFO.address}
                  <br />
                  {CONTACT_INFO.city}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-white-30">Phone</dt>
                <dd className="mt-1">
                  <a href={`tel:${CONTACT_INFO.phone}`} className="text-gold hover:text-gold-light">
                    {CONTACT_INFO.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-white-30">Email</dt>
                <dd className="mt-1">
                  <a href={`mailto:${CONTACT_INFO.email}`} className="text-gold hover:text-gold-light">
                    {CONTACT_INFO.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* Hours */}
          <div className="border border-white-10 bg-dark-800/50 p-8">
            <h2 className="mb-6 font-serif text-xl text-white">Opening hours</h2>
            <dl className="space-y-3 text-sm">
              {DAYS.map(({ key, label }) => {
                const h = businessHours[key];
                return (
                  <div key={key} className="flex justify-between border-b border-white-10 pb-2 last:border-b-0">
                    <dt className="text-white-70">{label}</dt>
                    <dd className={h ? 'text-white' : 'text-white-30'}>
                      {h ? `${h.open} – ${h.close}` : 'Closed'}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
