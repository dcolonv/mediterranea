import { RootDocument } from '@/components/layout/root-document';
import { BackofficeShell } from './backoffice-shell';

// Root layout of the backoffice: English, and prebuilt.
export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootDocument lang="en">
      <BackofficeShell>{children}</BackofficeShell>
    </RootDocument>
  );
}
