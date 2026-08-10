import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/auth-provider';
import { createCustomer } from '@/src/api/client';
import { CustomerForm } from '@/src/components/customer-form';
import type { CustomerFormData } from '@mediterranea/shared/validations';

export default function NewCustomerScreen() {
  const { getToken } = useAuth();
  const router = useRouter();

  const onSubmit = useCallback(
    async (data: CustomerFormData) => {
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      await createCustomer(token, data);
      router.back();
    },
    [getToken, router]
  );

  return <CustomerForm submitLabel="Create customer" onSubmit={onSubmit} />;
}
