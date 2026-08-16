import { BackofficeReports } from './backoffice-reports';

export const metadata = { title: 'Reports | Mediterranea Backoffice' };

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Intelligence</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Reports</h1>
        <p className="mt-2 text-white-50">
          Revenue, popular treatments, practitioner performance, no-show rate, and retention.
        </p>
      </div>
      <BackofficeReports />
    </div>
  );
}
