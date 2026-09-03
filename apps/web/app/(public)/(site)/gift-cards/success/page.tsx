import Link from 'next/link';
import { Button } from '@/components/ui';
import { getServerDictionary } from '@/lib/i18n/server';

export const metadata = {
  title: 'Thank you | Mediterránea Face Studio',
};

export default async function GiftCardSuccessPage() {
  const { dict } = await getServerDictionary();
  const g = dict.giftCards;

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-dark-900 px-6 pt-36 pb-24">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40">
          <svg className="h-7 w-7 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl text-white">{g.successTitle}</h1>
        <p className="mt-4 text-white-70">{g.successBody}</p>
        <div className="mt-8">
          <Link href="/">
            <Button variant="elegant">{g.backHome}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
