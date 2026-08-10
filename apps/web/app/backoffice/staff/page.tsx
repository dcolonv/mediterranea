import { BackofficeStaff } from './backoffice-staff';

export const metadata = {
  title: 'Staff | Mediterranea Backoffice',
};

export default function StaffPage() {
  return (
    <div>
      <div className="mb-10">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Team</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Staff</h1>
        <p className="mt-2 text-white-50">
          Practitioners, their working hours, and which treatments each is qualified to
          perform. This drives the availability engine.
        </p>
      </div>

      <BackofficeStaff />
    </div>
  );
}
