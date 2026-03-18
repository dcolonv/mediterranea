import Image from 'next/image';
import { CONTACT_INFO } from '@mediterranea/shared/constants';

export default function ComingSoonPage() {
  return (
    <section className="relative h-screen flex items-center justify-center grain-texture overflow-hidden">
      {/* Base background */}
      <div className="absolute inset-0 bg-dark-900" />

      {/* Atmospheric gradient layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(201,169,110,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_80%_90%,rgba(201,169,110,0.04),transparent)]" />

      {/* Floating vertical accent lines */}
      <div className="absolute top-[15%] left-[8%] w-px h-40 bg-gradient-to-b from-transparent via-gold/20 to-transparent" />
      <div className="absolute bottom-[20%] right-[10%] w-px h-32 bg-gradient-to-b from-transparent via-gold/15 to-transparent" />

      {/* Horizontal atmosphere lines */}
      <div className="absolute top-[25%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/[0.06] to-transparent" />
      <div className="absolute bottom-[25%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/[0.06] to-transparent" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-2xl w-full px-6 text-center py-12">
        {/* Logo */}
        <div className="mb-10">
          <Image
            src="/logo_dark.svg"
            alt="Mediterranea Skin Lab"
            width={220}
            height={60}
            className="mx-auto"
            priority
          />
        </div>

        {/* Decorative line + label */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
          <span className="text-[11px] tracking-[0.4em] text-gold/70 uppercase font-light">
            Opening Soon
          </span>
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
        </div>

        {/* Heading */}
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-wide text-white leading-[1.1]">
          Under Construction
        </h1>

        {/* Description */}
        <p className="mt-6 text-base sm:text-lg text-white-50 max-w-lg mx-auto leading-relaxed font-light">
          We&apos;re preparing something extraordinary. Our skincare
          clinic will be opening its doors soon.
        </p>

        {/* Divider */}
        <div className="mt-10 mb-10 flex items-center justify-center gap-4">
          <span className="h-px w-12 bg-gold/20" />
          <span className="w-1.5 h-1.5 rotate-45 border border-gold/30" />
          <span className="h-px w-12 bg-gold/20" />
        </div>

        {/* Contact info */}
        <div className="space-y-3">
          <p className="text-sm text-white-50 font-light">
            <a
              href={`tel:${CONTACT_INFO.phone}`}
              className="hover:text-gold transition-colors duration-300"
            >
              {CONTACT_INFO.phone}
            </a>
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
