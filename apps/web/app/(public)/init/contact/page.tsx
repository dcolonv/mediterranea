import { CONTACT_INFO } from '@mediterranea/shared/constants';
import { getPublicPolicy } from '@/actions/public-booking';
import { WhatsAppLink } from '@/components/whatsapp-link';
import { getServerDictionary } from '@/lib/i18n/server';
import type { Weekday } from '@mediterranea/shared/types';

// Reads live studio settings (hours) via the Admin SDK — render on demand, not at build.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contact & Hours | Mediterránea Face Studio',
  description: 'Find us, our opening hours, and how to get in touch.',
};

const DAY_KEYS: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default async function ContactPage() {
  const [{ businessHours }, { dict }] = await Promise.all([getPublicPolicy(), getServerDictionary()]);
  const cp = dict.contactPage;

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold/70">{cp.eyebrow}</span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">{cp.title}</h1>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact */}
          <div className="border border-white-10 bg-dark-800/50 p-8">
            <h2 className="mb-6 font-serif text-xl text-white">{cp.getInTouch}</h2>
            <dl className="space-y-5 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-white-30">{cp.address}</dt>
                <dd className="mt-1 leading-relaxed text-white-70">
                  {CONTACT_INFO.address}
                  <br />
                  {CONTACT_INFO.city}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-white-30">{cp.whatsapp}</dt>
                <dd className="mt-1">
                  <WhatsAppLink className="inline-flex items-center gap-2 text-gold hover:text-gold-light" />
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-white-30">{cp.email}</dt>
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
            <h2 className="mb-6 font-serif text-xl text-white">{cp.openingHours}</h2>
            <dl className="space-y-3 text-sm">
              {DAY_KEYS.map((key) => {
                const h = businessHours[key];
                return (
                  <div key={key} className="flex justify-between border-b border-white-10 pb-2 last:border-b-0">
                    <dt className="text-white-70">{cp[key]}</dt>
                    <dd className={h ? 'text-white' : 'text-white-30'}>
                      {h ? `${h.open} – ${h.close}` : cp.closed}
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
