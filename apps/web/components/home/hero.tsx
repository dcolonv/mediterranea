'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useLang } from '@/components/i18n/language-provider';
import { localizePath } from '@/lib/i18n/config';

export function Hero() {
  const { dict, locale } = useLang();
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden grain-texture">
      {/* Base background */}
      <div className="absolute inset-0 bg-dark-900" />

      {/* Atmospheric gradient layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_30%_-20%,rgba(201,169,110,0.10),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_90%_80%,rgba(201,169,110,0.04),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_10%_60%,rgba(255,255,255,0.015),transparent)]" />

      {/* Drifting golden glow */}
      <div className="absolute top-[20%] left-[30%] w-[500px] h-[350px] rounded-full bg-gold/[0.025] blur-3xl animate-glow-drift" />

      {/* Floating vertical accent lines */}
      <div className="absolute top-[20%] left-[5%] w-px h-40 bg-gradient-to-b from-transparent via-gold/20 to-transparent animate-float-up" />
      <div className="absolute bottom-[30%] left-[15%] w-px h-28 bg-gradient-to-b from-transparent via-white/[0.06] to-transparent animate-float-down" />

      {/* Horizontal atmosphere line */}
      <div className="absolute top-[18%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/[0.07] to-transparent" />

      {/* Content */}
      {/* The spacer above already clears the fixed header, so this
          only needs a little breathing room of its own. */}
      <div className="relative z-10 mx-auto max-w-7xl w-full px-6 lg:px-8 pt-10 pb-20 lg:pt-8 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text content */}
          <div className="text-center lg:text-left">
            {/* One h1 holds the tagline and the heading, so the words clients
                search for («estética facial en Málaga») are in the page's
                main title, not only in the copy around it. */}
            <h1>
              {/* Tagline */}
              <span
                className="mb-10 block animate-hero-enter [--hero-from-y:1.25rem]"
              >
                <span className="flex items-center justify-center lg:justify-start gap-6">
                  <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
                  <span className="font-sans text-xs sm:text-sm tracking-[0.35em] text-gold uppercase font-semibold">
                    {dict.hero.eyebrow}
                  </span>
                  <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50 lg:hidden" />
                </span>
              </span>{' '}
              {/* Heading — the global h1 letter-spacing, sized to this text
                  rather than inherited from the h1's own (body) font size. */}
              <span
                className="block font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-[0.05em] text-white leading-[1.1] whitespace-normal sm:whitespace-nowrap animate-hero-enter [--hero-from-y:2rem] [animation-delay:200ms]"
              >
                {dict.hero.headingLine1}
                <br />
                <span className="hero-gold-shimmer">{dict.hero.headingLine2}</span>
              </span>
            </h1>

            {/* Description */}
            <p
              className="mt-8 text-lg sm:text-xl text-white-50 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light animate-hero-enter [--hero-from-y:1.5rem] [animation-delay:500ms]"
            >
              {dict.hero.description}
            </p>

            {/* CTAs */}
            <div
              className="mt-12 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-8 animate-hero-enter [--hero-from-y:1.5rem] [animation-delay:700ms]"
            >
              <Link href={localizePath('/book', locale)}>
                <Button variant="elegant" size="lg">
                  {dict.hero.book}
                </Button>
              </Link>
              <Link
                href="#services"
                className="elegant-underline text-sm tracking-[0.25em] text-white-50 hover:text-white transition-colors uppercase font-light"
              >
                {dict.hero.explore}
              </Link>
            </div>
          </div>

          {/* Right — Hero image */}
          <div
            className="relative animate-hero-enter [--hero-from-x:2rem] [animation-delay:300ms]"
          >
            {/* Gold accent corner frames */}
            <div className="absolute -top-3 -right-3 w-24 h-24 border-t border-r border-gold/30 z-20 pointer-events-none" />
            <div className="absolute -bottom-3 -left-3 w-24 h-24 border-b border-l border-gold/30 z-20 pointer-events-none" />

            {/* Image container */}
            <div className="relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] overflow-hidden">
              <Image
                src="/hero-studio-room.jpg"
                alt={dict.hero.imageAlt}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              {/* Minimal edge blend so the image reads as clearly as possible */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900/15 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
