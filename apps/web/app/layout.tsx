import type { Metadata } from 'next';
import { Marcellus, Jost } from 'next/font/google';
import { AuthProvider } from '@/components/providers';
import { AnalyticsTracker } from '@/components/analytics/analytics-tracker';
import './globals.css';

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

const SITE_URL = 'https://www.mediterraneafacestudio.com';
const TITLE = 'Mediterránea Face Studio | Facial Treatments';
const DESCRIPTION =
  'A studio dedicated to personalized facial treatments in East Málaga. Every session is tailored to your skin.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // Link previews (WhatsApp, iMessage, Facebook, LinkedIn…).
  openGraph: {
    type: 'website',
    siteName: 'Mediterránea Face Studio',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'es_ES',
    alternateLocale: ['en_GB'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mediterránea Face Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${marcellus.variable} ${jost.variable}`}>
      <body className={`${jost.className} antialiased`}>
        <AnalyticsTracker />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
