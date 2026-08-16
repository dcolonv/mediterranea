'use server';

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import * as data from '@/lib/agent/data';

/**
 * Award loyalty points for a completed appointment. Idempotent: guarded by the
 * appointment's `loyaltyAwarded` flag so re-completing never double-awards.
 * Best-effort — safe to call from any completion path.
 */
export async function awardLoyaltyForCompletion(appointmentId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const settings = await data.getStudioSettings();
    const loyalty = settings.loyalty;
    if (!loyalty?.enabled) return;

    const apptRef = db.collection('appointments').doc(appointmentId);
    const apptSnap = await apptRef.get();
    if (!apptSnap.exists) return;
    const appt = apptSnap.data()!;
    if (appt.status !== 'completed' || appt.loyaltyAwarded) return;

    // Resolve the customer (by link, else by email).
    let customerRef = appt.customerId ? db.collection('customers').doc(appt.customerId) : null;
    if (!customerRef && appt.clientEmail) {
      const byEmail = await db
        .collection('customers')
        .where('email', '==', String(appt.clientEmail).toLowerCase())
        .limit(1)
        .get();
      if (!byEmail.empty) customerRef = byEmail.docs[0].ref;
    }
    if (!customerRef) return;

    // Points = round(service price × earn rate).
    const service = await data.getService(appt.serviceId);
    const price = service?.price ?? 0;
    const points = Math.round(price * loyalty.earnPointsPerEuro);
    if (points <= 0) {
      await apptRef.update({ loyaltyAwarded: true });
      return;
    }

    await db.runTransaction(async (tx) => {
      tx.update(customerRef!, { loyaltyPoints: FieldValue.increment(points), updatedAt: Timestamp.now() });
      tx.update(apptRef, { loyaltyAwarded: true });
    });
  } catch (error) {
    console.error('awardLoyaltyForCompletion failed:', error);
  }
}

/** Admin: adjust a customer's points by a signed delta. */
export async function adjustLoyaltyPoints(customerId: string, delta: number, _note?: string) {
  const d = Math.round(Number(delta));
  if (!Number.isFinite(d) || d === 0) {
    return { success: false as const, error: 'Enter a non-zero amount.' };
  }
  try {
    await getAdminDb().collection('customers').doc(customerId).update({
      loyaltyPoints: FieldValue.increment(d),
      updatedAt: Timestamp.now(),
    });
    return { success: true as const };
  } catch (error) {
    console.error('adjustLoyaltyPoints failed:', error);
    return { success: false as const, error: 'Failed to adjust points.' };
  }
}

/** Admin: redeem points (deduct), guarding against overdraw. Returns € value. */
export async function redeemLoyaltyPoints(customerId: string, points: number) {
  const p = Math.round(Number(points));
  if (!Number.isFinite(p) || p <= 0) {
    return { success: false as const, error: 'Enter a valid number of points.' };
  }
  const db = getAdminDb();
  const ref = db.collection('customers').doc(customerId);
  try {
    const settings = await data.getStudioSettings();
    const rate = settings.loyalty?.redeemPointsPerEuro ?? 20;
    const value = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const balance = (doc.data()?.loyaltyPoints as number) ?? 0;
      if (p > balance) throw new Error('insufficient');
      tx.update(ref, { loyaltyPoints: balance - p, updatedAt: Timestamp.now() });
      return Math.round((p / rate) * 100) / 100;
    });
    return { success: true as const, value };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error && e.message === 'insufficient' ? 'Not enough points.' : 'Failed to redeem.',
    };
  }
}
