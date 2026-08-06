import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

/** Redirects between the login screen and the app based on admin auth state. */
function useAuthGate() {
  const { user, isAdmin, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const onLogin = segments[0] === 'login';
    const authed = Boolean(user && isAdmin);

    if (!authed && !onLogin) {
      router.replace('/login');
    } else if (authed && onLogin) {
      router.replace('/');
    }
  }, [user, isAdmin, loading, segments, router]);
}

function RootNavigator() {
  const { loading } = useAuth();
  useAuthGate();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.goldDark,
        headerTitleStyle: { fontWeight: '600', color: colors.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="appointments/[id]" options={{ title: 'Appointment' }} />
      <Stack.Screen name="appointments/new" options={{ title: 'New Walk-in', presentation: 'modal' }} />
      <Stack.Screen name="customers/new" options={{ title: 'New Customer', presentation: 'modal' }} />
      <Stack.Screen name="customers/[id]" options={{ title: 'Customer' }} />
      <Stack.Screen name="customers/edit/[id]" options={{ title: 'Edit Customer', presentation: 'modal' }} />
      <Stack.Screen name="services/new" options={{ title: 'New Service', presentation: 'modal' }} />
      <Stack.Screen name="services/[id]" options={{ title: 'Edit Service' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
