'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { endCustomerSession } from '@/lib/auth/customer-client';

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await endCustomerSession();
        router.replace('/account/login');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
