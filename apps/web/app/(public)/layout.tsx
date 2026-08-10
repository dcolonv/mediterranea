import { LanguageProvider } from '@/components/i18n/language-provider';
import { getLocale } from '@/lib/i18n/server';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Provides the language context to the coming-soon root and all /init pages.
  // The /init layout adds the Header/Footer/<main>; the coming-soon page renders
  // its own full-screen section.
  const locale = await getLocale();
  return <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>;
}
