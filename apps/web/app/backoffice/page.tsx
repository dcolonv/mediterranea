import { BackofficeUpcoming } from './backoffice-upcoming';

export const metadata = {
  title: 'Upcoming | Mediterranea Backoffice',
};

export default function BackofficePage() {
  return (
    <div>
      <div className="mb-10">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Appointments</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Upcoming appointments</h1>
        <p className="mt-2 text-white-50">
          Everything from today onwards, soonest first. Select one to confirm, check in, reschedule
          or leave a note.
        </p>
      </div>

      <BackofficeUpcoming />
    </div>
  );
}
