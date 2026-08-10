import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui';
import { getCurrentCustomer } from '@/lib/auth/customer';
import { getMyAppointments } from '@/actions/account';
import { getMyReviewedAppointmentIds } from '@/actions/reviews';
import { AccountAppointments } from '@/components/account/account-appointments';
import { SignOutButton } from '@/components/account/sign-out-button';

export const metadata = {
  title: 'My account | Mediterránea Face Studio',
};

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect('/init/login');

  const [appts, reviewedIds] = await Promise.all([
    getMyAppointments(),
    getMyReviewedAppointmentIds(),
  ]);
  const upcoming = appts.success ? appts.upcoming : [];
  const past = appts.success ? appts.past : [];

  const firstName = customer.name?.split(' ')[0] || 'there';

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-[0.4em] text-gold/70">My account</span>
            <h1 className="mt-2 font-serif text-4xl tracking-wide text-white">Hello, {firstName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/init/account/profile">
              <Button variant="outline" size="sm">
                Profile
              </Button>
            </Link>
            <Link href="/init/book">
              <Button variant="elegant" size="sm">
                Book
              </Button>
            </Link>
            <SignOutButton />
          </div>
        </div>

        <AccountAppointments initialUpcoming={upcoming} initialPast={past} reviewedIds={reviewedIds} />
      </div>
    </section>
  );
}
