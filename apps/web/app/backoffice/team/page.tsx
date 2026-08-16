import { BackofficeTeam } from './backoffice-team';

export const metadata = { title: 'Team & Access | Mediterranea Backoffice' };

export default function TeamPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Control</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Team &amp; Access</h1>
        <p className="mt-2 text-white-50">
          Manage who can access the backoffice and which sections they can see.
        </p>
      </div>
      <BackofficeTeam />
    </div>
  );
}
