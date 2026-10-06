import { BackofficeCalendar } from './backoffice-calendar';

export const metadata = {
  title: 'Calendar | Mediterranea Backoffice',
};

export default function CalendarPage() {
  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <div className="mb-2 flex items-center gap-4 sm:mb-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Scheduling</span>
        </div>
        <h1 className="font-serif text-2xl text-white sm:text-3xl">Calendar</h1>
        <p className="mt-2 hidden text-white-50 sm:block">
          The studio schedule. Filter by practitioner or room, and book walk-ins.
        </p>
      </div>

      <BackofficeCalendar />
    </div>
  );
}
