'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/firebase/serialize';
import { staffSchema, type StaffFormData } from '@mediterranea/shared/validations';
import type { Staff } from '@mediterranea/shared/types';

const COLLECTION = 'staff';

export async function getStaffList() {
  try {
    const snap = await getAdminDb().collection(COLLECTION).orderBy('name', 'asc').get();
    const data = snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) })) as Staff[];
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching staff:', error);
    return { success: false, error: 'Failed to fetch staff.' };
  }
}

export async function createStaff(data: StaffFormData) {
  const result = staffSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    const now = Timestamp.now();
    const docRef = await getAdminDb().collection(COLLECTION).add({
      name: result.data.name,
      role: result.data.role,
      active: result.data.active ?? true,
      serviceIds: result.data.serviceIds ?? [],
      workingHours: result.data.workingHours ?? {},
      timeOff: result.data.timeOff ?? [],
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating staff:', error);
    return { success: false, error: 'Failed to create staff member.' };
  }
}

export async function updateStaff(id: string, data: StaffFormData) {
  const result = staffSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    await getAdminDb().collection(COLLECTION).doc(id).update({
      name: result.data.name,
      role: result.data.role,
      active: result.data.active ?? true,
      serviceIds: result.data.serviceIds ?? [],
      workingHours: result.data.workingHours ?? {},
      timeOff: result.data.timeOff ?? [],
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating staff:', error);
    return { success: false, error: 'Failed to update staff member.' };
  }
}

/**
 * Set which staff members are qualified for a service. Qualification lives on
 * each staff member's `serviceIds`, so this toggles the serviceId in/out of every
 * staff doc to match the given list (batched).
 */
export async function setServiceQualifiedStaff(serviceId: string, staffIds: string[]) {
  try {
    const db = getAdminDb();
    const snap = await db.collection(COLLECTION).get();
    const wanted = new Set(staffIds);

    const batch = db.batch();
    let changed = 0;
    for (const doc of snap.docs) {
      const current: string[] = doc.data().serviceIds ?? [];
      const has = current.includes(serviceId);
      const shouldHave = wanted.has(doc.id);
      if (has === shouldHave) continue;

      const next = shouldHave
        ? [...current, serviceId]
        : current.filter((id) => id !== serviceId);
      batch.update(doc.ref, { serviceIds: next, updatedAt: Timestamp.now() });
      changed++;
    }
    if (changed > 0) await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error setting service staff:', error);
    return { success: false, error: 'Failed to update qualified staff.' };
  }
}

export async function deleteStaff(id: string) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting staff:', error);
    return { success: false, error: 'Failed to delete staff member.' };
  }
}
