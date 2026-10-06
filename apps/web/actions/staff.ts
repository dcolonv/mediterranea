'use server';

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/firebase/serialize';
import { staffSchema, timeOffSchema, type StaffFormData } from '@mediterranea/shared/validations';
import type { Staff, TimeOff } from '@mediterranea/shared/types';

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
 * Add one time-off block to a practitioner, e.g. from the calendar. Appended
 * atomically, so it never overwrites edits made on the Staff page meanwhile.
 */
export async function addStaffTimeOff(staffId: string, input: TimeOff) {
  const parsed = timeOffSchema.safeParse(input);
  if (!parsed.success || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.date)) {
    return { success: false as const, error: 'Choose a date.' };
  }
  const t = parsed.data;
  if (t.endDate && t.endDate < t.date) {
    return { success: false as const, error: 'The end date is before the start date.' };
  }
  if (Boolean(t.start) !== Boolean(t.end)) {
    return { success: false as const, error: 'Set both times, or block the whole day.' };
  }
  if (t.start && t.end && t.end <= t.start) {
    return { success: false as const, error: 'The end time must be after the start time.' };
  }

  // Firestore rejects undefined fields, so only set what was given.
  const entry: TimeOff = {
    date: t.date,
    ...(t.endDate && t.endDate > t.date && { endDate: t.endDate }),
    ...(t.start && t.end && { start: t.start, end: t.end }),
    ...(t.reason?.trim() && { reason: t.reason.trim() }),
  };

  try {
    const ref = getAdminDb().collection(COLLECTION).doc(staffId);
    if (!(await ref.get()).exists) return { success: false as const, error: 'Staff member not found.' };
    await ref.update({ timeOff: FieldValue.arrayUnion(entry), updatedAt: Timestamp.now() });
    return { success: true as const };
  } catch (error) {
    console.error('Error adding time off:', error);
    return { success: false as const, error: 'Failed to save the blocked time.' };
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
