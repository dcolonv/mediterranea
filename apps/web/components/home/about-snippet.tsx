import Image from 'next/image';
import { ScrollReveal } from './scroll-reveal';

const values = [
  {
    title: 'High-Quality Products',
    description:
      'We use only dermo-cosmetic products backed by science and clinical results. Each formula is carefully chosen for its performance, skin compatibility, and long-term benefits. Your skin deserves the best\u2014and we deliver just that.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    ),
  },
  {
    title: 'Transparent Ingredients',
    description:
      'No secrets, no gimmicks. We believe you have the right to know what goes on your skin. That\u2019s why we\u2019re always happy to explain the ingredients we use and why they matter. Education is part of your glow.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    title: 'Ethically Sourced Materials',
    description:
      'We\u2019re committed to sourcing our materials with care and responsibility. From the lab to your skin, we prioritize sustainability, cruelty-free processes, and human-centered values at every step.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    ),
  },
];

export function AboutSnippet() {
  return (
    <section
      id="about"
      className="relative bg-dark-900 py-32 overflow-hidden grain-texture"
    >
      {/* Atmospheric gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_0%_50%,rgba(201,169,110,0.05),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_100%_30%,rgba(255,255,255,0.01),transparent)]" />

      {/* Decorative vertical lines */}
      <div className="absolute top-0 left-[15%] w-px h-full bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
      <div className="absolute top-0 right-[15%] w-px h-full bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Story section — Photo + Bio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center mb-32">
          {/* Left — Photo */}
          <ScrollReveal direction="left">
            <div className="relative">
              {/* Decorative gold corner frames */}
              <div className="absolute -top-4 -left-4 w-20 h-20 border-t border-l border-gold/30 z-10" />
              <div className="absolute -bottom-4 -right-4 w-20 h-20 border-b border-r border-gold/30 z-10" />

              <div className="relative overflow-hidden aspect-[3/4]">
                <Image
                  src="https://mediterraneaskinlab.com/_assets/media/67861646c5268c0c091abd657b2b17b3.jpg"
                  alt="Dr. Mariana, founder of Mediterranea Skin Lab"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {/* Subtle overlay for blending */}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900/40 via-transparent to-transparent" />
              </div>
            </div>
          </ScrollReveal>

          {/* Right — Story */}
          <div>
            <ScrollReveal>
              <div className="mb-8 flex items-center gap-5">
                <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
                <span className="text-[11px] tracking-[0.4em] text-gold/70 uppercase font-light">
                  Our Story
                </span>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-wide text-white mb-10 leading-[1.15]">
                Meet Dr. Mariana
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <p className="text-lg text-white-50 leading-relaxed mb-8 font-light">
                Hi, I&apos;m Dr. Mariana, the founder of Mediterranea Skin Lab. I
                hold a doctorate in pharmacy and have always been fascinated by
                the connection between skin health and overall well-being.
                Skin Lab was born from a desire to offer results-driven facial
                treatments rooted in dermatological science&mdash;yet delivered
                with warmth, care, and presence.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <p className="text-lg text-white-50 leading-relaxed font-light">
                I believe beauty is not about covering up, but about uncovering
                your natural radiance through knowledge, balance, and gentle
                care. Each treatment at Skin Lab is customized to your
                skin&apos;s unique needs, using clinically backed products and
                the latest in facial technology.
              </p>
            </ScrollReveal>
          </div>
        </div>

        {/* Values section */}
        <div className="text-center mb-16 mt-32">
          <ScrollReveal>
            <div className="mb-8 flex items-center justify-center gap-5">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
              <span className="text-[11px] tracking-[0.4em] text-gold/70 uppercase font-light">
                Our Values
              </span>
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-wide text-white leading-[1.15]">
              What We Stand For
            </h2>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          {values.map((value, index) => (
            <ScrollReveal key={value.title} delay={200 + index * 150}>
              <div className="group text-center">
                <div className="mx-auto w-16 h-16 border border-gold/20 flex items-center justify-center mb-6 group-hover:border-gold/60 group-hover:bg-gold/[0.04] transition-all duration-500">
                  <svg
                    className="w-7 h-7 text-gold/70 group-hover:text-gold transition-colors duration-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    {value.icon}
                  </svg>
                </div>
                <h3 className="font-serif text-xl text-white mb-4 tracking-wide">
                  {value.title}
                </h3>
                <p className="text-white-50 text-sm leading-relaxed font-light">
                  {value.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
