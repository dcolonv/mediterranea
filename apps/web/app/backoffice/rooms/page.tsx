import { BackofficeRooms } from './backoffice-rooms';

export const metadata = {
  title: 'Rooms | Mediterranea Backoffice',
};

export default function RoomsPage() {
  return (
    <div>
      <div className="mb-10">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Resources</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Rooms</h1>
        <p className="mt-2 text-white-50">
          Treatment rooms and their types. A service can require a matching room type.
        </p>
      </div>

      <BackofficeRooms />
    </div>
  );
}
