import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/auth-provider';
import {
  fetchAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  saveAppointmentNotes,
} from '@/src/api/client';
import { colors, spacing, radius, STATUS_STYLES, APPOINTMENT_STATUSES } from '@/src/theme';
import { Card, Button, Badge, Field, Loading, ErrorState, SectionLabel } from '@/src/components/ui';
import { formatDate, formatTime } from '@/src/format';
import { formatDuration } from '@mediterranea/shared/utils';
import type { Appointment, AppointmentStatus } from '@mediterranea/shared/types';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      const all = await fetchAppointments(token);
      const found = all.find((a) => a.id === id) ?? null;
      if (!found) throw new Error('Appointment not found.');
      setAppointment(found);
      setNotes(found.notes ?? '');
      setSavedNotes(found.notes ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load appointment.');
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const changeStatus = useCallback(
    async (status: AppointmentStatus) => {
      if (!appointment || status === appointment.status) return;
      setSaving(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Session expired.');
        await updateAppointmentStatus(token, appointment.id, status);
        setAppointment({ ...appointment, status });
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update status.');
      } finally {
        setSaving(false);
      }
    },
    [appointment, getToken]
  );

  const saveNotes = useCallback(async () => {
    if (!appointment) return;
    setSavingNotes(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      await saveAppointmentNotes(token, appointment.id, notes);
      setSavedNotes(notes);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  }, [appointment, getToken, notes]);

  const confirmDelete = useCallback(() => {
    if (!appointment) return;
    Alert.alert('Delete appointment', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) throw new Error('Session expired.');
            await deleteAppointment(token, appointment.id);
            router.back();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete.');
          }
        },
      },
    ]);
  }, [appointment, getToken, router]);

  if (loading) return <Loading />;
  if (error || !appointment) return <ErrorState message={error ?? 'Not found'} onRetry={load} />;

  const a = appointment;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{a.clientName}</Text>
        <Badge status={STATUS_STYLES[a.status]} />
      </View>
      <Text style={styles.service}>{a.serviceName}</Text>

      <Card style={styles.section}>
        <Row label="Date" value={formatDate(a.appointmentDate)} />
        <Row label="Time" value={formatTime(a.appointmentTime)} />
        <Row label="Duration" value={formatDuration(a.durationMinutes)} />
      </Card>

      <SectionLabel>Contact</SectionLabel>
      <Card style={styles.section}>
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${a.clientPhone}`)}>
          <Row label="Phone" value={a.clientPhone} link />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${a.clientEmail}`)}>
          <Row label="Email" value={a.clientEmail} link />
        </TouchableOpacity>
        {a.customerId ? (
          <Button
            title="View customer profile"
            variant="outline"
            onPress={() => router.push(`/customers/${a.customerId}`)}
            style={{ marginTop: spacing.md }}
          />
        ) : null}
      </Card>

      <SectionLabel>Treatment notes</SectionLabel>
      <Field
        label=""
        value={notes}
        onChangeText={setNotes}
        placeholder="Add treatment notes, observations, or aftercare given…"
        multiline
        numberOfLines={4}
        style={styles.notesInput}
      />
      {notes !== savedNotes ? (
        <Button
          title={savingNotes ? 'Saving…' : 'Save notes'}
          variant="outline"
          onPress={saveNotes}
          loading={savingNotes}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}

      <SectionLabel>Status</SectionLabel>
      <View style={styles.statusGrid}>
        {APPOINTMENT_STATUSES.map((s) => {
          const active = a.status === s;
          const style = STATUS_STYLES[s];
          return (
            <TouchableOpacity
              key={s}
              disabled={saving}
              onPress={() => changeStatus(s)}
              style={[
                styles.statusBtn,
                { borderColor: style.color },
                active && { backgroundColor: style.tint },
              ]}
            >
              <Text style={[styles.statusBtnText, { color: style.color }]}>{style.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button title="Delete appointment" variant="danger" onPress={confirmDelete} style={{ marginTop: spacing.xl }} />
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 24, fontWeight: '600', color: colors.ink, flex: 1, marginRight: spacing.sm },
  service: { fontSize: 15, color: colors.gold, fontWeight: '500', marginTop: spacing.xs, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  rowLabel: { fontSize: 14, color: colors.inkMuted },
  rowValue: { fontSize: 15, color: colors.ink, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  rowLink: { color: colors.goldDark },
  notes: { fontSize: 15, color: colors.inkSoft, lineHeight: 22 },
  notesInput: { minHeight: 96, textAlignVertical: 'top' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minWidth: '47%',
    alignItems: 'center',
  },
  statusBtnText: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
