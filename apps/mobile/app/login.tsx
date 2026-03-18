import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/providers/auth-provider';
import { useGoogleAuth, signInWithGoogleCredential } from '@/src/firebase/auth';

export default function LoginScreen() {
  const { user, loading } = useAuth();
  const { response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.idToken) {
      signInWithGoogleCredential(response.authentication.idToken).catch(console.error);
    }
  }, [response]);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c9a96e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Mediterranea</Text>
        <Text style={styles.brandSub}>Skin Lab</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Admin</Text>
        <Text style={styles.cardTitle}>Sign In</Text>
        <Text style={styles.cardSubtitle}>Access the mobile dashboard</Text>

        <TouchableOpacity style={styles.googleButton} onPress={() => promptAsync()}>
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Only authorized administrators can access admin features.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181818',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brand: {
    fontSize: 28,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  brandSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30,30,30,0.5)',
    padding: 32,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    color: '#c9a96e',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  disclaimer: {
    marginTop: 20,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
});
