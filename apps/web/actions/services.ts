'use server';

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase/config';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/firebase/serialize';
import { serviceSchema, type ServiceFormData } from '@mediterranea/shared/validations';
import type { Service } from '@mediterranea/shared/types';

const COLLECTION = 'services';

export async function getActiveServices() {
  try {
    const q = query(
      collection(db, 'services'),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    );

    const snapshot = await getDocs(q);
    const services: Service[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Service[];

    return { success: true, data: services };
  } catch (error) {
    console.error('Error fetching services:', error);
    return { success: false, error: 'Failed to fetch services.' };
  }
}

/** Admin: all services including inactive, ordered for management. */
export async function getAllServices() {
  try {
    const snapshot = await getAdminDb()
      .collection(COLLECTION)
      .orderBy('displayOrder', 'asc')
      .get();

    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...serializeDoc(doc.data()),
    })) as Service[];

    return { success: true, data: services };
  } catch (error) {
    console.error('Error fetching all services:', error);
    return { success: false, error: 'Failed to fetch services.' };
  }
}

export async function createService(data: ServiceFormData) {
  const result = serviceSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    const db = getAdminDb();
    const slug = result.data.slug;

    const existing = await db.collection(COLLECTION).where('slug', '==', slug).limit(1).get();
    if (!existing.empty) {
      return { success: false, error: 'A service with this slug already exists.' };
    }

    const docRef = await db.collection(COLLECTION).add({
      ...result.data,
      isActive: result.data.isActive ?? true,
      displayOrder: result.data.displayOrder ?? 0,
      createdAt: Timestamp.now(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating service:', error);
    return { success: false, error: 'Failed to create service.' };
  }
}

export async function updateService(id: string, data: ServiceFormData) {
  const result = serviceSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    const db = getAdminDb();
    const existing = await db.collection(COLLECTION).where('slug', '==', result.data.slug).limit(1).get();
    if (!existing.empty && existing.docs[0].id !== id) {
      return { success: false, error: 'Another service already uses this slug.' };
    }

    await db.collection(COLLECTION).doc(id).update({
      ...result.data,
      isActive: result.data.isActive ?? true,
      displayOrder: result.data.displayOrder ?? 0,
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating service:', error);
    return { success: false, error: 'Failed to update service.' };
  }
}

export async function deleteService(id: string) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting service:', error);
    return { success: false, error: 'Failed to delete service.' };
  }
}
