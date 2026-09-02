'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/firebase/serialize';
import { roomSchema, type RoomFormData } from '@mediterranea/shared/validations';
import type { Room } from '@mediterranea/shared/types';

const COLLECTION = 'rooms';

export async function getRoomsList() {
  try {
    const snap = await getAdminDb().collection(COLLECTION).orderBy('name', 'asc').get();
    const data = snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) })) as Room[];
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return { success: false, error: 'Failed to fetch rooms.' };
  }
}

export async function createRoom(data: RoomFormData) {
  const result = roomSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    const docRef = await getAdminDb().collection(COLLECTION).add({
      name: result.data.name,
      type: result.data.type,
      isActive: result.data.isActive ?? true,
      createdAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating room:', error);
    return { success: false, error: 'Failed to create room.' };
  }
}

export async function updateRoom(id: string, data: RoomFormData) {
  const result = roomSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    await getAdminDb().collection(COLLECTION).doc(id).update({
      name: result.data.name,
      type: result.data.type,
      isActive: result.data.isActive ?? true,
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating room:', error);
    return { success: false, error: 'Failed to update room.' };
  }
}

export async function deleteRoom(id: string) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting room:', error);
    return { success: false, error: 'Failed to delete room.' };
  }
}
