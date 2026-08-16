import { getPublishedReviews } from '@/actions/reviews';
import { getServerDictionary } from '@/lib/i18n/server';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="text-gold" aria-label={`${rating}/5`}>
      {'★'.repeat(Math.max(0, Math.min(5, rating)))}
      <span className="text-white-30">{'★'.repeat(5 - Math.max(0, Math.min(5, rating)))}</span>
    </div>
  );
}

export async function ReviewsSection() {
  const [reviews, { dict }] = await Promise.all([getPublishedReviews(9), getServerDictionary()]);
  if (reviews.length === 0) return null; // Hide entirely until there are published reviews.

  return (
    <section className="relative bg-dark-900 py-32 grain-texture overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(201,169,110,0.04),transparent)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="section-divider mb-6">
            <span className="text-[11px] tracking-[0.4em] text-gold uppercase font-semibold">
              {dict.reviews.sectionEyebrow}
            </span>
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-wide text-white">
            {dict.reviews.sectionTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.id} className="flex h-full flex-col border border-white-10 bg-dark-700/30 p-8">
              <Stars rating={r.rating} />
              {r.comment && (
                <p className="mt-4 flex-1 text-sm font-light leading-relaxed text-white-70">
                  “{r.comment}”
                </p>
              )}
              <div className="mt-6 text-sm text-white">
                {r.authorName}
                {r.serviceName && <span className="text-white-30"> · {r.serviceName}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
