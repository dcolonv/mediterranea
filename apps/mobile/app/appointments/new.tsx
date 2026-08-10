import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/auth-provider';
import {
  fetchSchedulingRefs,
  fetchAvailability,
  createWalkIn,
  type SchedulingRefs,
} from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme';
import { Button, Field, Loading, ErrorState, SectionLabel } from '@/src/components/ui';
import { formatTime, todayISO, shiftISO, weekdayShort, dayOfMonth } from '@/src/format';
import { formatDuration, formatPrice } from '@mediterranea/shared/utils';

export default function NewWalkInScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { getToken } = useAuth();
  const router = useRouter();

  const [refs, setRefs] = useState<SchedulingRefs | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState(''); // '' = any
  const today = todayISO();
  const [date, setDate] = useState(dateParam && dateParam >= today ? dateParam : today);

  const [times, setTimes] = useState<string[] | null>(null);
  const [findingTimes, setFindingTimes] = useState(false);
  const [time, setTime] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [booking, setBooking] = useState(false);

  const loadRefs = useCallback(async () => {
    try {
      setLoadError(null);
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      setRefs(await fetchSchedulingRefs(token));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load booking data.');
    }
  }, [getToken]);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  const resetTimes = () => {
    setTimes(null);
    setTime('');
  };

  const dateOptions = Array.from({ length: 14 }, (_, i) => shiftISO(today, i));

  async function findTimes() {
    if (!serviceId) {
      Alert.alert('Choose a treatment first');
      return;
    }
    setFindingTimes(true);
    resetTimes();
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      const res = await fetchAvailability(token, serviceId, date, staffId || undefined);
      setTimes(res.times);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load times.');
    } finally {
      setFindingTimes(false);
    }
  }

  async function book() {
    if (!serviceId || !time) {
      Alert.alert('Incomplete', 'Please choose a treatment and a time.');
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Incomplete', 'Please enter the client’s name, email, and phone.');
      return;
    }
    setBooking(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      await createWalkIn(token, {
        serviceId,
        date,
        time,
        staffId: staffId || undefined,
        clientName: name.trim(),
        clientEmail: email.trim(),
        clientPhone: phone.trim(),
      });
      Alert.alert('Booked', 'The walk-in appointment has been created.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      // A conflict or lost slot — clear times so they re-check.
      Alert.alert('Could not book', e instanceof Error ? e.message : 'Please try another time.');
      resetTimes();
    } finally {
      setBooking(false);
    }
  }

  if (loadError) return <ErrorState message={loadError} onRetry={loadRefs} />;
  if (!refs) return <Loading label="Loading…" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionLabel>Treatment</SectionLabel>
      <View style={styles.chipWrap}>
        {refs.services.map((s) => {
          const active = serviceId === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                setServiceId(s.id);
                resetTimes();
              }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.name}</Text>
              <Text style={[styles.chipSub, active && styles.chipTextActive]}>
                {formatDuration(s.durationMinutes)} · {formatPrice(s.price)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionLabel>Practitioner</SectionLabel>
      <View style={styles.chipWrap}>
        <TouchableOpacity
          style={[styles.pill, staffId === '' && styles.pillActive]}
          onPress={() => {
            setStaffId('');
            resetTimes();
          }}
        >
          <Text style={[styles.pillText, staffId === '' && styles.pillTextActive]}>Any</Text>
        </TouchableOpacity>
        {refs.staff.map((st) => {
          const active = staffId === st.id;
          return (
            <TouchableOpacity
              key={st.id}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => {
                setStaffId(st.id);
                resetTimes();
              }}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{st.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionLabel>Date</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
        {dateOptions.map((d) => {
          const active = date === d;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dateChip, active && styles.dateChipActive]}
              onPress={() => {
                setDate(d);
                resetTimes();
              }}
            >
              <Text style={[styles.dateWeekday, active && styles.pillTextActive]}>{weekdayShort(d)}</Text>
              <Text style={[styles.dateNum, active && styles.pillTextActive]}>{dayOfMonth(d)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Button
        title={findingTimes ? 'Finding…' : 'Find times'}
        variant="outline"
        onPress={findTimes}
        disabled={findingTimes || !serviceId}
        style={{ marginTop: spacing.lg }}
      />

      {findingTimes && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.md }} />}

      {times && times.length === 0 && (
        <Text style={styles.muted}>No open times on this day. Try another date.</Text>
      )}
      {times && times.length > 0 && (
        <>
          <SectionLabel>Time</SectionLabel>
          <View style={styles.chipWrap}>
            {times.map((t) => {
              const active = time === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setTime(t)}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{formatTime(t)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {time ? (
        <>
          <SectionLabel>Client</SectionLabel>
          <Field label="Full name" value={name} onChangeText={setName} placeholder="Client name" />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="client@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+34 600 000 000"
            keyboardType="phone-pad"
          />
          <Button
            title={booking ? 'Booking…' : 'Book walk-in'}
            onPress={book}
            loading={booking}
            style={{ marginTop: spacing.md }}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minWidth: '47%',
  },
  chipActive: { borderColor: colors.gold, backgroundColor: colors.card },
  chipText: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  chipSub: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  chipTextActive: { color: colors.goldDark },
  pill: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
  pillTextActive: { color: colors.onGold },
  dateRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  dateChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 56,
  },
  dateChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  dateWeekday: { fontSize: 11, color: colors.inkMuted, fontWeight: '600' },
  dateNum: { fontSize: 17, color: colors.ink, fontWeight: '700', marginTop: 2 },
  muted: { color: colors.inkMuted, fontSize: 14, marginTop: spacing.md },
});
