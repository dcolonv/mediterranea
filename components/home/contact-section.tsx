import { CONTACT_INFO, BUSINESS_HOURS } from '@/lib/constants';
import { ScrollReveal } from './scroll-reveal';

export function ContactSection() {
  return (
    <section
      id="contact"
      className="relative bg-dark-800 py-32 grain-texture overflow-hidden"
    >
      {/* Atmospheric gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(201,169,110,0.05),transparent)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-24">
            <div className="section-divider mb-6">
              <span className="text-[11px] tracking-[0.4em] text-gold/70 uppercase font-light">
                Get In Touch
              </span>
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-wide text-white">
              Contact Us
            </h2>
            <p className="mt-8 text-lg text-white-50 max-w-2xl mx-auto font-light leading-relaxed">
              We&apos;d love to hear from you. Reach out to schedule a
              consultation or ask any questions.
            </p>
          </div>
        </ScrollReveal>

        {/* Contact cards */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Location */}
          <ScrollReveal delay={0} className="h-full">
            <div className="text-center p-10 border border-white-10 bg-dark-700/20 card-shine card-gold-line transition-all duration-500 hover:border-gold/20 hover:bg-dark-700/40 h-full">
              <div className="mx-auto w-16 h-16 border border-gold/20 flex items-center justify-center mb-8 transition-colors duration-500 group-hover:border-gold/50">
                <svg
                  className="w-7 h-7 text-gold/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-white mb-4 tracking-wide">
                Location
              </h3>
              <p className="text-sm text-white-50 leading-relaxed font-light">
                {CONTACT_INFO.address}
                <br />
                {CONTACT_INFO.city}
              </p>
            </div>
          </ScrollReveal>

          {/* Phone & Email */}
          <ScrollReveal delay={150} className="h-full">
            <div className="text-center p-10 border border-white-10 bg-dark-700/20 card-shine card-gold-line transition-all duration-500 hover:border-gold/20 hover:bg-dark-700/40 h-full">
              <div className="mx-auto w-16 h-16 border border-gold/20 flex items-center justify-center mb-8">
                <svg
                  className="w-7 h-7 text-gold/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-white mb-4 tracking-wide">
                Contact
              </h3>
              <p className="text-sm text-white-50 font-light">
                <a
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="hover:text-gold transition-colors duration-300"
                >
                  {CONTACT_INFO.phone}
                </a>
              </p>
              <p className="text-sm text-white-50 mt-2 font-light">
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="hover:text-gold transition-colors duration-300"
                >
                  {CONTACT_INFO.email}
                </a>
              </p>
            </div>
          </ScrollReveal>

          {/* Hours */}
          <ScrollReveal delay={300} className="h-full">
            <div className="text-center p-10 border border-white-10 bg-dark-700/20 card-shine card-gold-line transition-all duration-500 hover:border-gold/20 hover:bg-dark-700/40 h-full">
              <div className="mx-auto w-16 h-16 border border-gold/20 flex items-center justify-center mb-8">
                <svg
                  className="w-7 h-7 text-gold/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-serif text-xl text-white mb-4 tracking-wide">
                Hours
              </h3>
              <div className="text-sm text-white-50 space-y-2 font-light">
                <p>
                  Mon - Fri: {BUSINESS_HOURS.monday?.open} -{' '}
                  {BUSINESS_HOURS.monday?.close}
                </p>
                <p>
                  Saturday: {BUSINESS_HOURS.saturday?.open} -{' '}
                  {BUSINESS_HOURS.saturday?.close}
                </p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
