import { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { signInWithGoogle, GoogleSignInCancelled } from '@/src/firebase/auth';
import { colors, spacing, radius } from '@/src/theme';

/**
 * Google sign-in. Mount ONLY when GOOGLE_AVAILABLE is true — the underlying
 * native module is absent in Expo Go.
 */
export function GoogleSignInButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const press = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // AuthProvider + the route gate take it from here.
    } catch (e) {
      // Backing out of the picker is not an error worth showing.
      if (!(e instanceof GoogleSignInCancelled)) {
        console.log('[auth] Google sign-in failed:', e);
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.button, busy && styles.busy]}
        onPress={press}
        disabled={busy}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color={colors.inkSoft} />
        ) : (
          <Text style={styles.text}>Sign in with Google</Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  busy: { opacity: 0.6 },
  text: { color: colors.inkSoft, fontSize: 15, fontWeight: '600' },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
