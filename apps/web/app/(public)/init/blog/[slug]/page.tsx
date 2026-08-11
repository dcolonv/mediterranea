import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedPost } from '@/actions/blog';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: 'Journal | Mediterránea Face Studio' };
  return {
    title: `${post.seoTitle || post.title} | Mediterránea Face Studio`,
    description: post.seoDescription || post.excerpt,
  };
}

function prettyDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, { dict }] = await Promise.all([getPublishedPost(slug), getServerDictionary()]);
  if (!post) notFound();

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <article className="mx-auto max-w-2xl">
        <Link href="/init/blog" className="text-sm text-white-50 transition-colors hover:text-white">
          ‹ {dict.blog.back}
        </Link>

        <p className="mt-8 text-xs uppercase tracking-wider text-gold/70">{prettyDate(post.publishedAt)}</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-wide text-white sm:text-5xl">
          {post.title}
        </h1>
        {post.authorName && <p className="mt-3 text-sm text-white-30">{post.authorName}</p>}

        {post.coverImageUrl && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-provided external URL */}
            <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mt-10 space-y-5 text-lg font-light leading-relaxed text-white-70">
          {post.body.split(/\n\n+/).map((para, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {para}
            </p>
          ))}
        </div>
      </article>
    </section>
  );
}
