import Image from 'next/image';
import { CONTACT_INFO } from '@mediterranea/shared/constants';
import { WhatsAppLink } from '@/components/whatsapp-link';
import { CountdownTimer } from '@/components/home/countdown-timer';
import { LanguageToggle } from '@/components/i18n/language-toggle';
import { getServerDictionary } from '@/lib/i18n/server';

export default async function ComingSoonPage() {
  const { dict } = await getServerDictionary();
  return (
    <section className="relative min-h-screen flex items-center justify-center grain-texture overflow-hidden">
      {/* Base background */}
      <div className="absolute inset-0 bg-dark-900" />

      {/* Language toggle */}
      <div className="absolute top-5 right-5 z-20">
        <LanguageToggle />
      </div>

      {/* Atmospheric gradient layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(201,169,110,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_80%_90%,rgba(201,169,110,0.04),transparent)]" />

      {/* Floating vertical accent lines */}
      <div className="hidden md:block absolute top-[15%] left-[8%] w-0.5 h-40 bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
      <div className="hidden md:block absolute bottom-[20%] right-[10%] w-0.5 h-32 bg-gradient-to-b from-transparent via-gold/30 to-transparent" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-2xl w-full px-6 text-center py-12">
        {/* Logo */}
        <div className="mb-10">
          <Image
            src="/logo_light.png"
            alt="Mediterránea Face Studio"
            width={280}
            height={126}
            className="mx-auto"
            priority
          />
        </div>

        {/* Decorative line + label */}
        <div className="flex items-center justify-center gap-3 md:gap-6 mb-6">
          <span className="h-0.5 w-16 bg-gradient-to-r from-transparent to-gold" />
          <span className="text-xs tracking-[0.4em] text-gold uppercase font-semibold">
            {dict.comingSoon.eyebrow}
          </span>
          <span className="h-0.5 w-16 bg-gradient-to-l from-transparent to-gold" />
        </div>

        {/* Heading */}
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl tracking-wide text-white leading-[1.2] whitespace-pre-line">
          {dict.comingSoon.heading}
        </h1>

        {/* Description */}
        <p className="mt-6 text-base sm:text-lg text-white-50 max-w-lg mx-auto leading-relaxed font-light">
          {dict.comingSoon.descriptionPrefix}
          <span className="text-white">{dict.comingSoon.date}</span>
        </p>
        <p className="mt-2 text-base sm:text-lg text-white-50 max-w-lg mx-auto leading-relaxed font-light">
          {dict.comingSoon.descriptionSuffix}
        </p>

        {/* Countdown */}
        <div className="mt-12">
          <CountdownTimer />
        </div>

        {/* Divider */}
        <div className="mt-12 mb-10 flex items-center justify-center gap-4">
          <span className="h-0.5 w-12 bg-gold/50" />
          <span className="w-2 h-2 rotate-45 bg-gold" />
          <span className="h-0.5 w-12 bg-gold/50" />
        </div>

        {/* Contact info */}
        <div className="space-y-3">
          <p className="text-sm text-white-50 font-light">
            <WhatsAppLink className="inline-flex items-center justify-center gap-2 hover:text-gold transition-colors duration-300" />
          </p>
          <p className="text-sm text-white-50 font-light">
            <a
              href={`mailto:${CONTACT_INFO.email}`}
              className="hover:text-gold transition-colors duration-300"
            >
              {CONTACT_INFO.email}
            </a>
          </p>
          <p className="text-sm text-white-50 font-light leading-relaxed">
            {CONTACT_INFO.address}
            <br />
            {CONTACT_INFO.city}
          </p>
        </div>
      </div>
    </section>
  );
}
