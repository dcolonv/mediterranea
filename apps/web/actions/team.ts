'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, syncAdminClaimForEmail } from '@/lib/firebase/admin';
import { getBackofficeAdminEmail } from '@/lib/auth/backoffice';
import type { Capability } from '@/lib/auth/capabilities';

const COLLECTION = 'admins';

export interface AdminEntry {
  email: string;
  capabilities: string[]; // empty = full access
}

export async function getAdmins() {
  try {
    const snap = await getAdminDb().collection(COLLECTION).get();
    const admins: AdminEntry[] = snap.docs.map((d) => ({
      email: d.id,
      capabilities: (d.data().capabilities as string[]) ?? [],
    }));
    admins.sort((a, b) => a.email.localeCompare(b.email));
    return { success: true as const, data: admins };
  } catch (error) {
    console.error('getAdmins failed:', error);
    return { success: false as const, error: 'Failed to load admins.' };
  }
}

/** The current backoffice admin's capabilities (null = full access / unknown). */
export async function getMyCapabilities(): Promise<string[] | null> {
  try {
    const email = await getBackofficeAdminEmail();
    if (!email) return null;
    const doc = await getAdminDb().collection(COLLECTION).doc(email).get();
    const caps = doc.data()?.capabilities as string[] | undefined;
    return caps && caps.length > 0 ? caps : null;
  } catch {
    return null;
  }
}

export async function setAdminCapabilities(email: string, capabilities: Capability[]) {
  try {
    await getAdminDb().collection(COLLECTION).doc(email.toLowerCase()).set(
      { capabilities, updatedAt: Timestamp.now() },
      { merge: true }
    );
    return { success: true as const };
  } catch (error) {
    console.error('setAdminCapabilities failed:', error);
    return { success: false as const, error: 'Failed to update access.' };
  }
}

export async function addAdmin(email: string, capabilities: Capability[]) {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
    return { success: false as const, error: 'Enter a valid email.' };
  }
  try {
    const db = getAdminDb();
    const ref = db.collection(COLLECTION).doc(e);
    if ((await ref.get()).exists) return { success: false as const, error: 'That admin already exists.' };
    await ref.set({ email: e, capabilities, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    // Stamp the admin role claim if they already have an account.
    await syncAdminClaimForEmail(e);
    return { success: true as const };
  } catch (error) {
    console.error('addAdmin failed:', error);
    return { success: false as const, error: 'Failed to add the admin.' };
  }
}

export async function removeAdmin(email: string) {
  try {
    const me = await getBackofficeAdminEmail();
    if (me && me === email.toLowerCase()) {
      return { success: false as const, error: 'You can’t remove your own access.' };
    }
    await getAdminDb().collection(COLLECTION).doc(email.toLowerCase()).delete();
    return { success: true as const };
  } catch (error) {
    console.error('removeAdmin failed:', error);
    return { success: false as const, error: 'Failed to remove the admin.' };
  }
}
