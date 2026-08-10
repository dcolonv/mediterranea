import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/src/providers/auth-provider';
import { runCustomerMigration } from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme';
import { Card, Button, SectionLabel } from '@/src/components/ui';
import { initials } from '@/src/format';

export default function SettingsScreen() {
  const { user, getToken, signOut } = useAuth();
  const [migrating, setMigrating] = useState(false);

  const runMigration = useCallback(() => {
    Alert.alert(
      'Sync customers',
      'Build/refresh customer profiles from all existing appointments. This is safe to run multiple times.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            setMigrating(true);
            try {
              const token = await getToken();
              if (!token) throw new Error('Session expired.');
              const r = await runCustomerMigration(token);
              Alert.alert(
                'Sync complete',
                `${r.customersCreated} created, ${r.customersUpdated} updated\n${r.appointmentsLinked} appointments linked`
              );
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Migration failed.');
            } finally {
              setMigrating(false);
            }
          },
        },
      ]
    );
  }, [getToken]);

  const confirmSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }, [signOut]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.displayName || user?.email || '?')}</Text>
        </View>
        <View style={styles.profileInfo}>
          {user?.displayName ? <Text style={styles.name}>{user.displayName}</Text> : null}
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.role}>Administrator</Text>
        </View>
      </Card>

      <SectionLabel>Data</SectionLabel>
      <Card style={styles.section}>
        <Text style={styles.desc}>
          Sync customer profiles from existing appointments. Run this once after upgrading, or any time data looks out of date.
        </Text>
        <Button
          title="Sync customers from appointments"
          variant="outline"
          onPress={runMigration}
          loading={migrating}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <Button title="Sign out" variant="danger" onPress={confirmSignOut} style={{ marginTop: spacing.xl }} />

      <Text style={styles.brand}>Mediterránea Face Studio · Admin</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  profile: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.goldTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatarText: { color: colors.goldDark, fontWeight: '700', fontSize: 18 },
  profileInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '600', color: colors.ink },
  email: { fontSize: 14, color: colors.inkMuted, marginTop: 2 },
  role: { fontSize: 12, color: colors.gold, fontWeight: '700', textTransform: 'uppercase', marginTop: spacing.xs },
  section: { marginBottom: spacing.lg },
  desc: { fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
  brand: {
    textAlign: 'center',
    color: colors.inkFaint,
    fontSize: 12,
    marginTop: spacing.xxl,
    letterSpacing: 0.5,
  },
});
