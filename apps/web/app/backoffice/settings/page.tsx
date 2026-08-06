import { BackofficeSettings } from './backoffice-settings';

export const metadata = {
  title: 'Settings | Mediterranea Backoffice',
};

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Configuration</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Settings</h1>
        <p className="mt-2 text-white-50">
          Business hours, booking rules, and the cancellation policy.
        </p>
      </div>

      <BackofficeSettings />
    </div>
  );
}
