import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { registerPushToken } from '@/src/api/client';

/**
 * Expo Go dropped remote push notifications in SDK 53, and merely importing
 * expo-notifications there throws on Android — which took the whole route
 * module down with it. Everything below therefore loads expo-notifications
 * lazily, and only outside Expo Go. Push works in a development build.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Load expo-notifications on demand; null in Expo Go or if it fails to load. */
async function loadNotifications() {
  if (isExpoGo) return null;
  try {
    return await import('expo-notifications');
  } catch (error) {
    console.log('[push] expo-notifications unavailable:', error);
    return null;
  }
}

/**
 * Show notifications while the app is foregrounded. Call once from the app
 * root; a no-op in Expo Go.
 */
export async function configureNotificationHandler(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Best-effort registration for staff push notifications. Requests permission,
 * obtains the Expo push token, and registers it with the backend. Silently
 * no-ops on simulators, in Expo Go, when permission is denied, or in
 * environments that can't mint a token. Never throws.
 */
export async function registerForPushNotifications(
  getToken: () => Promise<string | null>
): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const Notifications = await loadNotifications();
    if (!Notifications) {
      if (isExpoGo) console.log('[push] skipped: Expo Go has no push; use a development build.');
      return;
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoToken = tokenResponse.data;
    if (!expoToken) return;

    const authToken = await getToken();
    if (!authToken) return;
    await registerPushToken(authToken, expoToken);
  } catch (error) {
    console.log('[push] registration skipped:', error);
  }
}
