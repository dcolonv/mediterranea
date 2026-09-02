import Link from 'next/link';
import { Button } from '@/components/ui';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Treatment Technology | Mediterránea Face Studio',
  description: 'The tools and technology we use to treat your skin — LED, INDIBA, microneedling, microcurrent and more.',
};

export default async function TreatmentsPage() {
  const { dict } = await getServerDictionary();
  const t = dict.technology;
  const p = dict.products;

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
              {t.eyebrow}
            </span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">{t.title}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white-50">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((item, i) => (
            <div
              key={item.name}
              className="group flex h-full flex-col border border-white-10 bg-dark-800/40 p-8 transition-all duration-500 hover:border-gold/30 hover:bg-dark-800/70"
            >
              <span className="mb-5 font-serif text-2xl text-gold/40 transition-colors duration-500 group-hover:text-gold/70">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="font-serif text-xl leading-snug text-white transition-colors duration-300 group-hover:text-gold">
                {item.name}
              </h2>
              <p className="mt-3 flex-1 text-sm font-light leading-relaxed text-white-50">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Products we work with */}
        <div className="mt-28">
          <div className="mb-14 text-center">
            <div className="mb-6 flex items-center justify-center gap-5">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
              <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
                {p.eyebrow}
              </span>
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
            </div>
            <h2 className="font-serif text-3xl tracking-wide text-white sm:text-4xl">{p.title}</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white-50">{p.subtitle}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {p.items.map((brand) => (
              <a
                key={brand.name}
                href={brand.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col border border-white-10 bg-dark-800/40 p-8 transition-all duration-500 hover:border-gold/30 hover:bg-dark-800/70"
              >
                <h3 className="font-serif text-2xl text-white transition-colors duration-300 group-hover:text-gold">
                  {brand.name}
                </h3>
                <p className="mt-3 flex-1 text-sm font-light leading-relaxed text-white-50">
                  {brand.description}
                </p>
                <span className="mt-6 inline-flex items-center gap-1 text-xs uppercase tracking-wider text-gold/70 transition-colors group-hover:text-gold">
                  {p.visit}
                  <span aria-hidden>↗</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link href="/book">
            <Button variant="elegant" size="lg">
              {dict.services.cta}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
