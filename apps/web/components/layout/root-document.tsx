import { Marcellus, Jost } from 'next/font/google';
import { AuthProvider } from '@/components/providers';
import { AnalyticsTracker } from '@/components/analytics/analytics-tracker';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import type { Locale } from '@/lib/i18n/config';
import '@/app/globals.css';

const marcellus = Marcellus({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marcellus',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-jost',
  display: 'swap',
});

/**
 * The <html> and <body> of every root layout. There is one root for the
 * public site, whose language comes from the request, and English ones for
 * the staff pages (backoffice, login): reading the request in a shared root
 * would make the staff pages render on demand instead of being prebuilt.
 */
export function RootDocument({ lang, children }: { lang: Locale; children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the public site's pre-paint consent script adds
    // a data attribute here before React hydrates.
    <html lang={lang} className={`${marcellus.variable} ${jost.variable}`} suppressHydrationWarning>
      <body className={`${jost.className} antialiased`}>
        {/* Google Analytics — only after the visitor accepts. */}
        <AnalyticsTracker />
        {/* Vercel Web Analytics — cookieless and anonymous, so it also counts
            the visitors who never answer the consent banner. */}
        <VercelAnalytics />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
