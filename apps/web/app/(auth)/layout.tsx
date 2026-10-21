import { RootDocument } from '@/components/layout/root-document';

export const metadata = { title: 'Login | Mediterranea Backoffice' };

// Root layout of the staff sign-in: English, and prebuilt.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="en">{children}</RootDocument>;
}
