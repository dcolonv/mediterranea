import { BackofficeGiftCards } from './backoffice-gift-cards';

export const metadata = {
  title: 'Gift Cards | Mediterranea Backoffice',
};

export default function GiftCardsPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Commerce</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Gift Cards</h1>
        <p className="mt-2 text-white-50">
          Issue, redeem, and track gift cards. Online purchases mint automatically after payment.
        </p>
      </div>

      <BackofficeGiftCards />
    </div>
  );
}
