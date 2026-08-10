import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/providers/auth-provider';
import { fetchAppointments } from '@/src/api/client';
import { colors, spacing, radius, STATUS_STYLES } from '@/src/theme';
import { Badge, Loading, ErrorState, EmptyState } from '@/src/components/ui';
import {
  formatTime,
  formatDate,
  todayISO,
  shiftISO,
  weekStartISO,
  weekdayShort,
  dayOfMonth,
} from '@/src/format';
import type { Appointment } from '@mediterranea/shared/types';

const OCCUPYING = new Set(['pending', 'confirmed', 'checked-in']);

export default function ScheduleScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (date: string) => {
      try {
        setError(null);
        const token = await getToken();
        if (!token) throw new Error('Session expired. Please sign in again.');
        const data = await fetchAppointments(token, { startDate: date, endDate: date });
        data.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
        setAppointments(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load the schedule.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken]
  );

  useFocusEffect(
    useCallback(() => {
      load(selected);
    }, [load, selected])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(selected);
  }, [load, selected]);

  const weekStart = weekStartISO(selected);
  const weekDays = Array.from({ length: 7 }, (_, i) => shiftISO(weekStart, i));

  return (
    <View style={styles.container}>
      {/* Week strip */}
      <View style={styles.weekBar}>
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={() => setSelected(shiftISO(selected, -7))} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.inkSoft} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelected(today)}>
            <Text style={styles.todayLink}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelected(shiftISO(selected, 7))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={22} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {weekDays.map((d) => {
            const isSelected = d === selected;
            const isToday = d === today;
            return (
              <TouchableOpacity key={d} style={styles.dayCell} onPress={() => setSelected(d)}>
                <Text style={[styles.dayName, isToday && styles.todayText]}>{weekdayShort(d)}</Text>
                <View style={[styles.dayNumWrap, isSelected && styles.dayNumWrapActive]}>
                  <Text
                    style={[
                      styles.dayNum,
                      isSelected && styles.dayNumActive,
                      !isSelected && isToday && styles.todayText,
                    ]}
                  >
                    {dayOfMonth(d)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>{formatDate(selected)}</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push({ pathname: '/appointments/new', params: { date: selected } })}
        >
          <Ionicons name="add" size={18} color={colors.onGold} />
          <Text style={styles.newBtnText}>Walk-in</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Loading label="Loading schedule…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(selected)} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
          }
          ListEmptyComponent={
            <EmptyState title="Nothing scheduled" subtitle="No appointments on this day." />
          }
          renderItem={({ item }) => {
            const dimmed = !OCCUPYING.has(item.status);
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.row, dimmed && styles.rowDimmed]}
                onPress={() => router.push(`/appointments/${item.id}`)}
              >
                <View style={styles.timeCol}>
                  <Text style={styles.time}>{formatTime(item.appointmentTime)}</Text>
                  <Text style={styles.duration}>{item.durationMinutes}m</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.clientName}</Text>
                  <Text style={styles.service}>{item.serviceName}</Text>
                </View>
                <Badge status={STATUS_STYLES[item.status]} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  weekBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  todayLink: { color: colors.goldDark, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  dayCell: { alignItems: 'center', flex: 1, gap: 4 },
  dayName: { fontSize: 11, color: colors.inkMuted, fontWeight: '600' },
  dayNumWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumWrapActive: { backgroundColor: colors.gold },
  dayNum: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  dayNumActive: { color: colors.onGold },
  todayText: { color: colors.goldDark },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  subHeaderText: { fontSize: 15, color: colors.inkSoft, fontWeight: '600' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  newBtnText: { color: colors.onGold, fontWeight: '700', fontSize: 13 },
  list: { padding: spacing.lg, flexGrow: 1, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  rowDimmed: { opacity: 0.55 },
  timeCol: { width: 64, alignItems: 'center' },
  time: { fontSize: 15, fontWeight: '700', color: colors.goldDark },
  duration: { fontSize: 11, color: colors.inkFaint },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.ink },
  service: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
});
