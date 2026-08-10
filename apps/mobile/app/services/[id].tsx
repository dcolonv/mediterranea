import { useState, useCallback } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/providers/auth-provider';
import { fetchAllServices, updateService, deleteService } from '@/src/api/client';
import { ServiceForm } from '@/src/components/service-form';
import { Loading, ErrorState } from '@/src/components/ui';
import { colors } from '@/src/theme';
import type { Service } from '@mediterranea/shared/types';
import type { ServiceFormData } from '@mediterranea/shared/validations';

export default function EditServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      const all = await fetchAllServices(token);
      const found = all.find((s) => s.id === id) ?? null;
      if (!found) throw new Error('Service not found.');
      setService(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load service.');
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSubmit = useCallback(
    async (data: ServiceFormData) => {
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      await updateService(token, id, data);
      router.back();
    },
    [getToken, id, router]
  );

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete service', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) throw new Error('Session expired.');
            await deleteService(token, id);
            router.back();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete.');
          }
        },
      },
    ]);
  }, [getToken, id, router]);

  if (loading) return <Loading />;
  if (error || !service) return <ErrorState message={error ?? 'Not found'} onRetry={load} />;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={confirmDelete} hitSlop={12}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          ),
        }}
      />
      <ServiceForm
        initial={{
          name: service.name,
          slug: service.slug,
          description: service.description,
          category: service.category,
          durationMinutes: service.durationMinutes,
          price: service.price,
          displayOrder: service.displayOrder,
          isActive: service.isActive,
        }}
        submitLabel="Save changes"
        onSubmit={onSubmit}
      />
    </>
  );
}
