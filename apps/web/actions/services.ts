'use server';

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Service } from '@mediterranea/shared/types';

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
