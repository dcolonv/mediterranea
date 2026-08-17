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

export const metadata: Metadata = {
  title: 'Mediterránea Face Studio | Facial Treatments',
  description:
    'Experience the art of Mediterranean facial treatments. Expert facials and personalized care.',
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
