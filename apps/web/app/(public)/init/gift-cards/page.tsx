import { GiftCardForm } from '@/components/gift-cards/gift-card-form';
import { giftCardsAvailable } from '@/actions/gift-cards';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gift Cards | Mediterránea Face Studio',
  description: 'Give the gift of a personalized facial treatment.',
};

export default async function GiftCardsPage() {
  const [available, { dict }] = await Promise.all([giftCardsAvailable(), getServerDictionary()]);
  const g = dict.giftCards;

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 text-center">
          <div className="mb-6 flex items-center justify-center gap-5">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">{g.eyebrow}</span>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide text-white sm:text-5xl">{g.title}</h1>
          <p className="mx-auto mt-6 max-w-lg text-lg font-light text-white-50">{g.subtitle}</p>
        </div>

        <GiftCardForm available={available} />
      </div>
    </section>
  );
}
