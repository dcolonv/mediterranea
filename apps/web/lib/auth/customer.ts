/**
 * Server-only helpers for the customer account area. Resolves the logged-in
 * customer from the `__customer` session cookie via the Admin SDK, find-or-
 * creating (and uid-linking) their `customers` record. Never import from a
 * client component.
 */
import { cookies } from 'next/headers';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, verifyCustomerSession } from '@/lib/firebase/admin';
import type { Customer } from '@mediterranea/shared/types';

const COLLECTION = 'customers';

/** The signed-in customer, find-or-created and linked to their auth uid. */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const cookie = (await cookies()).get('__customer')?.value;
  const session = await verifyCustomerSession(cookie);
  if (!session) return null;

  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).where('email', '==', session.email).limit(1).get();

  if (snap.empty) {
    const now = Timestamp.now();
    const ref = await db.collection(COLLECTION).add({
      name: session.email.split('@')[0],
      email: session.email,
      phone: '',
      notes: '',
      tags: [],
      uid: session.uid,
      totalVisits: 0,
      lastVisitDate: null,
      createdAt: now,
      updatedAt: now,
    });
    const doc = await ref.get();
    return { id: doc.id, ...doc.data() } as Customer;
  }

  const doc = snap.docs[0];
  if (doc.data().uid !== session.uid) {
    await doc.ref.update({ uid: session.uid, updatedAt: Timestamp.now() });
  }
  return { id: doc.id, ...doc.data() } as Customer;
}

/** Strip Firestore Timestamps so a Customer can cross the server→client boundary. */
export function toPlainCustomer(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    tags: c.tags ?? [],
    skinProfile: c.skinProfile ?? {},
    intake: {
      allergies: c.intake?.allergies ?? '',
      medications: c.intake?.medications ?? '',
      conditions: c.intake?.conditions ?? '',
      notes: c.intake?.notes ?? '',
    },
    consent: {
      treatmentConsent: c.consent?.treatmentConsent ?? false,
      marketingOptIn: c.consent?.marketingOptIn ?? false,
      signedName: c.consent?.signedName ?? '',
    },
    totalVisits: c.totalVisits ?? 0,
    lastVisitDate: c.lastVisitDate ?? null,
  };
}

export type PlainCustomer = ReturnType<typeof toPlainCustomer>;
