import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentCustomer, toPlainCustomer } from '@/lib/auth/customer';
import { ProfileForm } from '@/components/account/profile-form';

export const metadata = {
  title: 'My profile | Mediterránea Face Studio',
};

export default async function ProfilePage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect('/account/login');

  return (
    <section className="relative min-h-screen bg-dark-900 px-6 pb-24 pt-36 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/account" className="text-sm text-white-50 transition-colors hover:text-white">
          ‹ Back to account
        </Link>
        <h1 className="mb-10 mt-6 font-serif text-4xl tracking-wide text-white">Your profile</h1>
        <ProfileForm customer={toPlainCustomer(customer)} />
      </div>
    </section>
  );
}
