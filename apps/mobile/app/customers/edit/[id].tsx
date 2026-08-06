import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/auth-provider';
import { fetchCustomer, updateCustomer } from '@/src/api/client';
import { CustomerForm } from '@/src/components/customer-form';
import { Loading, ErrorState } from '@/src/components/ui';
import type { Customer } from '@mediterranea/shared/types';
import type { CustomerFormData } from '@mediterranea/shared/validations';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      const { customer } = await fetchCustomer(token, id);
      setCustomer(customer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customer.');
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSubmit = useCallback(
    async (data: CustomerFormData) => {
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      await updateCustomer(token, id, data);
      router.back();
    },
    [getToken, id, router]
  );

  if (loading) return <Loading />;
  if (error || !customer) return <ErrorState message={error ?? 'Not found'} onRetry={load} />;

  return (
    <CustomerForm
      initial={{
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes,
        tags: customer.tags,
      }}
      submitLabel="Save changes"
      onSubmit={onSubmit}
    />
  );
}
