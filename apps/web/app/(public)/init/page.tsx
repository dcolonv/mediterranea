import {
  Hero,
  ServicesOverview,
  AboutSnippet,
  CtaBanner,
  ContactSection,
} from '@/components/home';
import { ReviewsSection } from '@/components/home/reviews-section';

// Renders published reviews (Admin SDK) + locale-aware copy — on demand.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <AboutSnippet />
      <ReviewsSection />
      <CtaBanner />
      <ContactSection />
    </>
  );
}
