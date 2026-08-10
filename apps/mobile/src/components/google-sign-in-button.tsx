import { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useGoogleAuth, signInWithGoogleCredential } from '@/src/firebase/auth';
import { colors, spacing, radius } from '@/src/theme';

/**
 * Renders the Google sign-in button. Mount ONLY when GOOGLE_CONFIGURED is true —
 * the underlying useAuthRequest hook throws without a platform client id.
 */
export function GoogleSignInButton() {
  const { response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.idToken) {
      signInWithGoogleCredential(response.authentication.idToken).catch(console.error);
    }
  }, [response]);

  return (
    <TouchableOpacity style={styles.button} onPress={() => promptAsync()}>
      <Text style={styles.text}>Sign in with Google</Text>
    </TouchableOpacity>
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
  text: { color: colors.inkSoft, fontSize: 15, fontWeight: '600' },
});
