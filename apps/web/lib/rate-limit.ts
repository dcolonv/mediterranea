/**
 * Firestore-backed fixed-window rate limiter. Suitable for low-volume abuse
 * protection on unauthenticated endpoints (e.g. public booking). Each key gets a
 * `rateLimits/{key}` doc holding the current window start and count; a
 * transaction resets the window when it has elapsed.
 */
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

const COLLECTION = 'rateLimits';

/** Sanitize an arbitrary key into a safe Firestore document id. */
function docId(key: string): string {
  return key.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 200);
}

/**
 * Returns `true` when the action is allowed (and records it), `false` when the
 * caller has exceeded `limit` within `windowSeconds`. Fails open on error so a
 * limiter hiccup never blocks a legitimate booking.
 */
export async function allowAction(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const ref = getAdminDb().collection(COLLECTION).doc(docId(key));
    return await getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const windowMs = windowSeconds * 1000;

      const data = snap.exists ? (snap.data() as { windowStart: number; count: number }) : null;
      if (!data || now - data.windowStart >= windowMs) {
        tx.set(ref, { windowStart: now, count: 1, updatedAt: Timestamp.now() });
        return true;
      }
      if (data.count >= limit) {
        return false;
      }
      tx.update(ref, { count: data.count + 1, updatedAt: Timestamp.now() });
      return true;
    });
  } catch (error) {
    console.error('[rate-limit] check failed, failing open:', error);
    return true;
  }
}
