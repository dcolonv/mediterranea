import Link from 'next/link';
import { getPublishedPosts } from '@/actions/blog';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Journal | Mediterránea Face Studio',
  description: 'Skincare tips, treatments, and studio news.',
};

function prettyDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogPage() {
  const [posts, { dict }] = await Promise.all([getPublishedPosts(), getServerDictionary()]);
  const b = dict.blog;

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold/70">{b.eyebrow}</span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">{b.title}</h1>
          <p className="mx-auto mt-6 max-w-lg text-lg font-light text-white-50">{b.subtitle}</p>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-white-50">{b.empty}</p>
        ) : (
          <div className="space-y-8">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/init/blog/${p.slug}`}
                className="group block border border-white-10 bg-dark-800/40 p-8 transition-colors hover:border-gold/30"
              >
                <p className="text-xs uppercase tracking-wider text-gold/70">{prettyDate(p.publishedAt)}</p>
                <h2 className="mt-2 font-serif text-2xl text-white transition-colors group-hover:text-gold">
                  {p.title}
                </h2>
                {p.excerpt && <p className="mt-3 font-light leading-relaxed text-white-50">{p.excerpt}</p>}
                <span className="mt-4 inline-block text-sm text-gold">{b.readMore} →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
