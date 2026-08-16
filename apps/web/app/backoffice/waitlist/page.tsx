import { BackofficeWaitlist } from './backoffice-waitlist';

export const metadata = {
  title: 'Waitlist | Mediterranea Backoffice',
};

export default function WaitlistPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Scheduling</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Waitlist</h1>
        <p className="mt-2 text-white-50">
          Clients waiting for a spot. When a matching appointment is cancelled, they’re notified
          automatically.
        </p>
      </div>

      <BackofficeWaitlist />
    </div>
  );
}
