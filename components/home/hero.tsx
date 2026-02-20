'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

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
      <div className="relative z-10 mx-auto max-w-7xl w-full px-6 lg:px-8 pt-32 pb-20 lg:pt-0 lg:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text content */}
          <div className="text-center lg:text-left">
            {/* Tagline */}
            <div
              className={`mb-10 transition-all duration-1000 ease-out ${
                mounted
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-5'
              }`}
            >
              <div className="flex items-center justify-center lg:justify-start gap-6">
                <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
                <span className="text-[11px] tracking-[0.4em] text-gold/70 uppercase font-light">
                  Luxury Skincare
                </span>
                <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50 lg:hidden" />
              </div>
            </div>

            {/* Heading */}
            <h1
              className={`font-serif text-5xl sm:text-6xl lg:text-7xl xl:text-[5.25rem] tracking-wide text-white leading-[1.1] transition-all duration-1000 delay-200 ease-out ${
                mounted
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
            >
              Discover Your
              <br />
              <span className="hero-gold-shimmer">Natural Radiance</span>
            </h1>

            {/* Description */}
            <p
              className={`mt-8 text-lg sm:text-xl text-white-50 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light transition-all duration-1000 delay-500 ease-out ${
                mounted
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-6'
              }`}
            >
              Experience the art of Mediterranean skincare at our exclusive
              clinic. Where ancient traditions meet modern luxury to reveal your
              skin&apos;s true beauty.
            </p>

            {/* CTAs */}
            <div
              className={`mt-12 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-8 transition-all duration-1000 delay-700 ease-out ${
                mounted
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-6'
              }`}
            >
              <Link href="/appointments">
                <Button variant="elegant" size="lg">
                  Book Appointment
                </Button>
              </Link>
              <Link
                href="#services"
                className="elegant-underline text-sm tracking-[0.25em] text-white-50 hover:text-white transition-colors uppercase font-light"
              >
                Explore Services
              </Link>
            </div>
          </div>

          {/* Right — Hero image */}
          <div
            className={`relative transition-all duration-1000 delay-300 ease-out ${
              mounted
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-8'
            }`}
          >
            {/* Gold accent corner frames */}
            <div className="absolute -top-3 -right-3 w-24 h-24 border-t border-r border-gold/30 z-20 pointer-events-none" />
            <div className="absolute -bottom-3 -left-3 w-24 h-24 border-b border-l border-gold/30 z-20 pointer-events-none" />

            {/* Image container */}
            <div className="relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] overflow-hidden">
              <Image
                src="/hero-clinic.png"
                alt="Mediterranea Skin Lab — Luxury treatment room"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              {/* Gradient overlays to blend into dark background */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-dark-900/40 lg:to-dark-900/60" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-dark-900/20" />

              {/* Warm overlay to tie image into the dark/gold palette */}
              <div className="absolute inset-0 bg-dark-900/10 mix-blend-multiply" />
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
