import {
  Hero,
  ServicesOverview,
  AboutSnippet,
  CtaBanner,
  ContactSection,
} from '@/components/home';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <AboutSnippet />
      <CtaBanner />
      <ContactSection />
    </>
  );
}
