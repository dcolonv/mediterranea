/**
 * Staff push notifications via Expo's push service. Device tokens are registered
 * by the mobile admin app and stored in `pushTokens/{token}`. Sends are
 * best-effort; tokens Expo reports as unregistered are pruned.
 */
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

const COLLECTION = 'pushTokens';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Store (or refresh) a staff device's Expo push token. */
export async function registerPushToken(email: string, token: string): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(token).set(
    { token, email, updatedAt: Timestamp.now() },
    { merge: true }
  );
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/** Send a push to every registered staff device. Prunes dead tokens. */
export async function sendStaffPush(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const snap = await getAdminDb().collection(COLLECTION).get();
    const tokens = snap.docs.map((d) => d.id).filter((t) => t.startsWith('ExponentPushToken'));
    if (tokens.length === 0) {
      console.log('[push] no registered staff devices');
      return;
    }

    const messages = tokens.map((to) => ({ to, title, body, sound: 'default', data: data ?? {} }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      console.error('[push] Expo push failed:', res.status, await res.text());
      return;
    }

    const json = (await res.json()) as { data?: ExpoTicket[] };
    const tickets = json.data ?? [];
    const dead: string[] = [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        dead.push(tokens[i]);
      }
    });
    if (dead.length) {
      const batch = getAdminDb().batch();
      dead.forEach((t) => batch.delete(getAdminDb().collection(COLLECTION).doc(t)));
      await batch.commit();
      console.log(`[push] pruned ${dead.length} dead token(s)`);
    }
  } catch (error) {
    console.error('[push] sendStaffPush error:', error);
  }
}
