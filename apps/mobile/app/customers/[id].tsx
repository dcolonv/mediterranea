import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/auth-provider';
import { fetchCustomer, deleteCustomer } from '@/src/api/client';
import { colors, spacing, radius, STATUS_STYLES } from '@/src/theme';
import { Card, Button, Badge, Loading, ErrorState, SectionLabel } from '@/src/components/ui';
import { ClientPhotos } from '@/src/components/client-photos';
import { initials, formatDate, formatTime } from '@/src/format';
import type { Customer, Appointment } from '@mediterranea/shared/types';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      const { customer, appointments } = await fetchCustomer(token, id);
      setCustomer(customer);
      setAppointments(appointments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customer.');
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete customer', 'This removes the profile but keeps their appointments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) throw new Error('Session expired.');
            await deleteCustomer(token, id);
            router.back();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete.');
          }
        },
      },
    ]);
  }, [getToken, id, router]);

  if (loading) return <Loading />;
  if (error || !customer) return <ErrorState message={error ?? 'Not found'} onRetry={load} />;

  const c = customer;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(c.name)}</Text>
        </View>
        <Text style={styles.name}>{c.name}</Text>
        <Text style={styles.rollup}>
          {c.totalVisits} {c.totalVisits === 1 ? 'visit' : 'visits'}
          {c.lastVisitDate ? ` · last ${formatDate(c.lastVisitDate)}` : ''}
        </Text>
      </View>

      {c.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {c.tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <SectionLabel>Contact</SectionLabel>
      <Card style={styles.section}>
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone}`)}>
          <Row label="Phone" value={c.phone} link />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${c.email}`)}>
          <Row label="Email" value={c.email} link />
        </TouchableOpacity>
      </Card>

      {c.notes ? (
        <>
          <SectionLabel>Notes</SectionLabel>
          <Card style={styles.section}>
            <Text style={styles.notes}>{c.notes}</Text>
          </Card>
        </>
      ) : null}

      <SectionLabel>Before &amp; after photos</SectionLabel>
      <View style={styles.section}>
        <ClientPhotos customerId={id} getToken={getToken} />
      </View>

      <SectionLabel>Appointment history</SectionLabel>
      {appointments.length === 0 ? (
        <Card style={styles.section}>
          <Text style={styles.empty}>No appointments on record.</Text>
        </Card>
      ) : (
        appointments.map((a) => (
          <Card key={a.id} style={styles.historyCard} onPress={() => router.push(`/appointments/${a.id}`)}>
            <View style={styles.historyTop}>
              <Text style={styles.historyService}>{a.serviceName}</Text>
              <Badge status={STATUS_STYLES[a.status]} />
            </View>
            <Text style={styles.historyDate}>
              {formatDate(a.appointmentDate)} · {formatTime(a.appointmentTime)}
            </Text>
          </Card>
        ))
      )}

      <Button
        title="Edit profile"
        variant="outline"
        onPress={() => router.push(`/customers/edit/${id}`)}
        style={{ marginTop: spacing.xl }}
      />
      <Button title="Delete customer" variant="danger" onPress={confirmDelete} style={{ marginTop: spacing.md }} />
    </ScrollView>
  );
}

function Row({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, link && styles.rowLink]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.goldTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.goldDark, fontWeight: '700', fontSize: 24 },
  name: { fontSize: 24, fontWeight: '600', color: colors.ink },
  rollup: { fontSize: 14, color: colors.inkMuted, marginTop: spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg, justifyContent: 'center' },
  tag: { backgroundColor: colors.goldTint, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  tagText: { color: colors.goldDark, fontSize: 12, fontWeight: '600' },
  section: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  rowLabel: { fontSize: 14, color: colors.inkMuted },
  rowValue: { fontSize: 15, color: colors.ink, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  rowLink: { color: colors.goldDark },
  notes: { fontSize: 15, color: colors.inkSoft, lineHeight: 22 },
  empty: { fontSize: 14, color: colors.inkMuted },
  historyCard: { marginBottom: spacing.md },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  historyService: { fontSize: 15, fontWeight: '600', color: colors.ink, flex: 1, marginRight: spacing.sm },
  historyDate: { fontSize: 13, color: colors.inkMuted },
});
