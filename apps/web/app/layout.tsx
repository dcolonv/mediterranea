import type { Metadata } from 'next';
import { Marcellus, Jost } from 'next/font/google';
import { AuthProvider } from '@/components/providers';
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
  title: 'Mediterranea Skin Lab | Skincare Clinic',
  description:
    'Experience the art of Mediterranean skincare. Expert facials, treatments, and personalized care.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${marcellus.variable} ${jost.variable}`}>
      <body className={`${jost.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
