import { BackofficeCampaigns } from './backoffice-campaigns';

export const metadata = { title: 'Campaigns | Mediterranea Backoffice' };

export default function CampaignsPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Marketing</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Campaigns</h1>
        <p className="mt-2 text-white-50">
          Reach clients by email or SMS. Target everyone, marketing opt-ins, a tag, or clients who
          haven’t visited in a while.
        </p>
      </div>
      <BackofficeCampaigns />
    </div>
  );
}
