import type { Metadata } from 'next';
import { RootDocument } from '@/components/layout/root-document';
import { LanguageProvider } from '@/components/i18n/language-provider';
import { CookieBanner } from '@/components/consent/cookie-banner';
import { CONSENT_PREPAINT_SCRIPT } from '@/lib/consent';
import { localizePath } from '@/lib/i18n/config';
import { getLocale, getServerDictionary } from '@/lib/i18n/server';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

// The home page's title and snippet in search results, in the page's language;
// other pages set their own title and description over these.
export async function generateMetadata(): Promise<Metadata> {
  const { locale, dict } = await getServerDictionary();
  const title = dict.meta.homeTitle;
  const description = dict.meta.homeDescription;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    // Link previews (WhatsApp, iMessage, Facebook, LinkedIn…).
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: localizePath('/', locale),
      locale: OG_LOCALES[locale],
      alternateLocale: [OG_LOCALES[locale === 'es' ? 'en' : 'es']],
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  };
}

const OG_LOCALES = { es: 'es_ES', en: 'en_GB' } as const;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root layout of the public site, in the request's language: the URL's on
  // localized pages, the cookie's elsewhere. Provides the language context to
  // the coming-soon root and all site pages; the (site) layout adds the
  // Header/Footer/<main>, the coming-soon page renders its own section.
  const locale = await getLocale();
  return (
    <RootDocument lang={locale}>
      {/* Before anything paints, so the cookie banner never flashes. */}
      <script dangerouslySetInnerHTML={{ __html: CONSENT_PREPAINT_SCRIPT }} />
      <LanguageProvider initialLocale={locale}>
        {children}
        <CookieBanner />
      </LanguageProvider>
    </RootDocument>
  );
}
