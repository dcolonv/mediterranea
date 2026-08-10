import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken } from '@/src/api/client';

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Best-effort registration for staff push notifications. Requests permission,
 * obtains the Expo push token, and registers it with the backend. Silently no-ops
 * on simulators, when permission is denied, or in environments that can't mint a
 * token (e.g. Expo Go on Android). Never throws.
 */
export async function registerForPushNotifications(
  getToken: () => Promise<string | null>
): Promise<void> {
  try {
    if (!Device.isDevice) return;

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
