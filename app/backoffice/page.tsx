import { BackofficeAppointments } from './backoffice-appointments';

export const metadata = {
  title: 'Appointments | Mediterranea Backoffice',
};

export default function BackofficePage() {
  return (
    <div>
      <div className="mb-10">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">
            Dashboard
          </span>
        </div>
        <h1 className="font-serif text-3xl text-white">Appointments</h1>
        <p className="mt-2 text-white-50">
          Manage and view all appointment requests
        </p>
      </div>

      <BackofficeAppointments />
    </div>
  );
}
