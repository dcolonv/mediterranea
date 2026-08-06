import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/providers/auth-provider';
import { fetchAllServices } from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme';
import { Card, Loading, ErrorState, EmptyState } from '@/src/components/ui';
import { formatPrice, formatDuration } from '@mediterranea/shared/utils';
import type { Service } from '@mediterranea/shared/types';

export default function ServicesScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      const data = await fetchAllServices(token);
      setServices(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load services.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) return <Loading label="Loading services…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={<EmptyState title="No services" subtitle="Add one with the + button." />}
        renderItem={({ item }) => (
          <Card style={styles.cardSpacing} onPress={() => router.push(`/services/${item.id}`)}>
            <View style={styles.top}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>{formatPrice(item.price)}</Text>
            </View>
            <Text style={styles.meta}>
              {item.category[0].toUpperCase() + item.category.slice(1)} · {formatDuration(item.durationMinutes)}
            </Text>
            {!item.isActive ? (
              <View style={styles.inactivePill}>
                <Text style={styles.inactiveText}>Inactive</Text>
              </View>
            ) : null}
          </Card>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/services/new')} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.onGold} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, flexGrow: 1 },
  cardSpacing: { marginBottom: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.ink, flex: 1, marginRight: spacing.sm },
  price: { fontSize: 16, fontWeight: '600', color: colors.gold },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: spacing.xs },
  inactivePill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  inactiveText: { fontSize: 11, color: colors.danger, fontWeight: '700', textTransform: 'uppercase' },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
