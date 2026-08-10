import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/providers/auth-provider';
import { signInWithEmail, GOOGLE_CONFIGURED } from '@/src/firebase/auth';
import { GoogleSignInButton } from '@/src/components/google-sign-in-button';
import { colors, spacing, radius } from '@/src/theme';
import { Field, Button, Loading } from '@/src/components/ui';

function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Sign in failed. Please try again.';
  }
}

export default function LoginScreen() {
  const { user, isAdmin, adminCheckFailed, recheckAdmin, loading, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  const retry = async () => {
    setRechecking(true);
    try {
      await recheckAdmin();
    } finally {
      setRechecking(false);
    }
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      // AuthProvider + gate handle navigation once admin is confirmed.
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      setError(friendlyAuthError(code));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  // Signed in, but the admin check couldn't reach the server.
  const connectionFailed = Boolean(user && adminCheckFailed);
  // Signed in, server responded, and the user is genuinely not an admin.
  const deniedAccess = Boolean(user && !isAdmin && !adminCheckFailed);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>Mediterránea</Text>
            <Text style={styles.brandSub}>Face Studio</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Admin Console</Text>

            {connectionFailed ? (
              <>
                <Text style={styles.cardTitle}>Can’t reach the server</Text>
                <Text style={styles.cardSubtitle}>
                  Signed in as {user?.email}, but the app couldn’t verify admin
                  access. Make sure the web server is running and on the same network.
                </Text>
                <Button title="Retry" onPress={retry} loading={rechecking} />
                <Button
                  title="Sign out"
                  variant="ghost"
                  onPress={signOut}
                  style={{ marginTop: spacing.sm }}
                />
              </>
            ) : deniedAccess ? (
              <>
                <Text style={styles.cardTitle}>Access denied</Text>
                <Text style={styles.cardSubtitle}>
                  {user?.email}{'\n'}is not an authorized administrator.
                </Text>
                <Button title="Use a different account" variant="outline" onPress={signOut} />
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Sign In</Text>
                <Text style={styles.cardSubtitle}>
                  Manage appointments, customers and services
                </Text>

                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="admin@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Button title="Sign In" onPress={submit} loading={submitting} />

                {GOOGLE_CONFIGURED ? <GoogleSignInButton /> : null}

                <Text style={styles.disclaimer}>
                  Only authorized administrators can access this app.
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  brand: { fontSize: 30, fontWeight: '400', color: colors.ink, letterSpacing: 2 },
  brandSub: {
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  cardLabel: {
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 24,
    color: colors.ink,
    fontWeight: '500',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 20,
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.md, textAlign: 'center' },
  disclaimer: {
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: 'center',
  },
});
