import { BackofficeReviews } from './backoffice-reviews';

export const metadata = {
  title: 'Reviews | Mediterranea Backoffice',
};

export default function ReviewsPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Feedback</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Reviews</h1>
        <p className="mt-2 text-white-50">
          Add reviews from Google to show on the home page. Hide one to take it off the site.
        </p>
      </div>

      <BackofficeReviews />
    </div>
  );
}
