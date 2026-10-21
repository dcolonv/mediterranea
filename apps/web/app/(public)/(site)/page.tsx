import type { Metadata } from 'next';
import {
  Hero,
  ServicesOverview,
  AboutSnippet,
  CtaBanner,
  ContactSection,
} from '@/components/home';
import { ReviewsSection } from '@/components/home/reviews-section';
import { JsonLd } from '@/components/json-ld';
import { getBookingServices } from '@/actions/public-booking';
import { getLocale } from '@/lib/i18n/server';
import { localizedAlternates, studioJsonLd } from '@/lib/seo';

// Renders published reviews (Admin SDK) + locale-aware copy — on demand.
export const dynamic = 'force-dynamic';

// Title and description come from the root layout.
export async function generateMetadata(): Promise<Metadata> {
  return { alternates: localizedAlternates('/', await getLocale()) };
}

// Its own component, so its query runs alongside the reviews' instead of
// holding up the whole page.
async function StudioJsonLd() {
  const [services, locale] = await Promise.all([getBookingServices(), getLocale()]);
  return <JsonLd data={studioJsonLd(services, locale)} />;
}

export default function HomePage() {
  return (
    <>
      <StudioJsonLd />
      {/* Clears the fixed header. */}
      <div className="h-24" aria-hidden />
      <Hero />
      <ServicesOverview />
      <AboutSnippet />
      <ReviewsSection />
      <CtaBanner />
      <ContactSection />
    </>
  );
}
