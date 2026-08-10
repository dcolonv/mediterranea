import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/auth-provider';
import { createService } from '@/src/api/client';
import { ServiceForm } from '@/src/components/service-form';
import type { ServiceFormData } from '@mediterranea/shared/validations';

export default function NewServiceScreen() {
  const { getToken } = useAuth();
  const router = useRouter();

  const onSubmit = useCallback(
    async (data: ServiceFormData) => {
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      await createService(token, data);
      router.back();
    },
    [getToken, router]
  );

  return <ServiceForm submitLabel="Create service" onSubmit={onSubmit} />;
}
