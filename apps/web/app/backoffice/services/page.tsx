import { BackofficeServices } from './backoffice-services';

export const metadata = {
  title: 'Services | Mediterranea Backoffice',
};

export default function ServicesPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Catalog</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Services</h1>
        <p className="mt-2 text-white-50">
          Manage treatments, the room type each needs, and which practitioners can perform them.
        </p>
      </div>

      <BackofficeServices />
    </div>
  );
}
