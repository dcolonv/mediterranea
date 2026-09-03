
export const metadata = {
  title: 'Booking QR | Mediterránea Face Studio',
  description: 'Scan to book an appointment at Mediterránea Face Studio.',
  // A printable asset, not a page for search results.
  robots: { index: false, follow: false },
};

const BOOK_URL = 'https://www.mediterraneafacestudio.com/book';

export default function QrPage() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-dark-900 px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="mb-8 flex items-center justify-center gap-5 print:hidden">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold/50" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.4em] text-gold">
            Mediterránea Face Studio
          </span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold/50" />
        </div>

        <h1 className="font-serif text-3xl tracking-wide text-white sm:text-4xl">
          Reserva tu cita · Book your appointment
        </h1>

        {/* The printed artefact: QR + the URL underneath. The cream/ink colours
            are set explicitly (not via theme tokens) so the card always prints
            dark-on-light. A plain <img> is used deliberately: the QR must be
            served pixel-exact, with no lossy re-encoding that could soften the
            modules — and next/image failed to paint this asset. */}
        <div className="mx-auto mt-10 w-full max-w-sm border border-white-10 bg-[#fcfbf9] p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/qr-book.png"
            alt={`QR code linking to ${BOOK_URL}`}
            width={1400}
            height={1400}
            className="block h-auto w-full"
          />
          <p className="mt-4 break-all text-center text-xs tracking-wide text-[#34302b]">
            mediterraneafacestudio.com/book
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 print:hidden">
          <a
            href="/qr-book.png"
            download="mediterranea-qr-book.png"
            className="cursor-pointer border border-gold px-6 py-3 text-sm uppercase tracking-wider text-gold transition-colors hover:bg-gold hover:text-charcoal"
          >
            Descargar PNG · Download PNG
          </a>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-white-30 print:hidden">
          Escanea con la cámara del móvil para reservar · Scan with a phone camera to book
        </p>
      </div>
    </section>
  );
}
