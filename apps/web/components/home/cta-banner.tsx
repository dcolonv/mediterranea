'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { ScrollReveal } from './scroll-reveal';
import { useLang } from '@/components/i18n/language-provider';

export function CtaBanner() {
  const { dict } = useLang();
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-dark-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(201,169,110,0.06),transparent)]" />

      {/* Decorative borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <ScrollReveal>
          <p className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white tracking-wide leading-[1.3]">
            {dict.cta.line1}
            <br />
            {dict.cta.line2Prefix}
            <span className="text-gold">{dict.cta.line2Accent}</span>
          </p>
          <p className="mt-8 text-white-50 text-lg font-light max-w-xl mx-auto leading-relaxed">
            {dict.cta.body}
          </p>
          <div className="mt-12">
            <Link href="/init/book">
              <Button variant="elegant" size="lg">
                {dict.cta.button}
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
