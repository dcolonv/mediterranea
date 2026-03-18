import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/src/providers/auth-provider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#181818' },
          headerTintColor: '#c9a96e',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#181818' },
        }}
      />
    </AuthProvider>
  );
}
