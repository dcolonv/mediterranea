import {
  Hero,
  ServicesOverview,
  AboutSnippet,
  CtaBanner,
  ContactSection,
} from '@/components/home';
import { ReviewsSection } from '@/components/home/reviews-section';
import { CountdownBanner } from '@/components/home/countdown-banner';

// Renders published reviews (Admin SDK) + locale-aware copy — on demand.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <CountdownBanner />
      <Hero />
      <ServicesOverview />
      <AboutSnippet />
      <ReviewsSection />
      <CtaBanner />
      <ContactSection />
    </>
  );
}
