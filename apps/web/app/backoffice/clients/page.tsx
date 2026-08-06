import { BackofficeClients } from './backoffice-clients';

export const metadata = {
  title: 'Clients | Mediterranea Backoffice',
};

export default function ClientsPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">People</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Clients</h1>
        <p className="mt-2 text-white-50">
          Search the client book, review history, and keep notes and tags up to date.
        </p>
      </div>

      <BackofficeClients />
    </div>
  );
}
