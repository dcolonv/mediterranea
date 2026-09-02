'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/firebase/serialize';
import { getCurrentCustomer } from '@/lib/auth/customer';
import * as data from '@/lib/agent/data';
import { reviewSchema, type ReviewFormData } from '@mediterranea/shared/validations';
import type { Review, ReviewStatus } from '@mediterranea/shared/types';

const COLLECTION = 'reviews';

export interface PublicReview {
  id: string;
  authorName: string;
  serviceName: string;
  rating: number;
  comment: string;
  createdAt: string | null;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Client';
}

/** Which of the customer's completed appointments already have a review. */
export async function getMyReviewedAppointmentIds(): Promise<string[]> {
  const customer = await getCurrentCustomer();
  if (!customer) return [];
  const snap = await getAdminDb().collection(COLLECTION).where('customerId', '==', customer.id).get();
  return snap.docs.map((d) => d.data().appointmentId as string);
}

/** Customer submits a review for one of their completed appointments. */
export async function submitMyReview(input: ReviewFormData) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: 'Please choose a rating (1–5).' };
  }

  const customer = await getCurrentCustomer();
  if (!customer) return { success: false as const, error: 'Please sign in.' };

  const appt = await data.getAppointment(parsed.data.appointmentId);
  if (!appt) return { success: false as const, error: 'Appointment not found.' };

  const mine = appt.customerId === customer.id || appt.clientEmail === customer.email;
  if (!mine) return { success: false as const, error: 'That appointment is not on your account.' };
  if (appt.status !== 'completed') {
    return { success: false as const, error: 'You can review an appointment after it’s completed.' };
  }

  const db = getAdminDb();
  // One review per appointment.
  const existing = await db
    .collection(COLLECTION)
    .where('appointmentId', '==', appt.id)
    .limit(1)
    .get();
  if (!existing.empty) {
    return { success: false as const, error: 'You’ve already reviewed this appointment.' };
  }

  const now = Timestamp.now();
  await db.collection(COLLECTION).add({
    customerId: customer.id,
    appointmentId: appt.id,
    authorName: firstName(customer.name),
    serviceName: appt.serviceName,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? '',
    status: 'pending' as ReviewStatus,
    createdAt: now,
    updatedAt: now,
  });

  return { success: true as const };
}

/** Published reviews for public display (newest first). */
export async function getPublishedReviews(max = 12): Promise<PublicReview[]> {
  try {
    const snap = await getAdminDb().collection(COLLECTION).where('status', '==', 'published').get();
    const reviews = snap.docs
      .map((d) => {
        const r = d.data();
        const created = r.createdAt as { toDate?: () => Date } | undefined;
        return {
          id: d.id,
          authorName: r.authorName ?? 'Client',
          serviceName: r.serviceName ?? '',
          rating: r.rating ?? 5,
          comment: r.comment ?? '',
          createdAt: created?.toDate ? created.toDate().toISOString() : null,
        } satisfies PublicReview;
      })
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return reviews.slice(0, max);
  } catch (error) {
    console.error('Error loading published reviews:', error);
    return [];
  }
}

// ── Admin moderation ─────────────────────────────────────────────────────────────

export async function getAllReviews() {
  try {
    const snap = await getAdminDb().collection(COLLECTION).get();
    const reviews = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Review)
      .sort((a, b) => {
        const at = a.createdAt?.toMillis?.() ?? 0;
        const bt = b.createdAt?.toMillis?.() ?? 0;
        return bt - at;
      })
      .map((r) => serializeDoc(r));
    return { success: true as const, data: reviews };
  } catch (error) {
    console.error('Error loading reviews:', error);
    return { success: false as const, error: 'Failed to load reviews.' };
  }
}

export async function setReviewStatus(id: string, status: ReviewStatus) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).update({
      status,
      updatedAt: Timestamp.now(),
    });
    return { success: true as const };
  } catch (error) {
    console.error('Error updating review status:', error);
    return { success: false as const, error: 'Failed to update the review.' };
  }
}

export async function deleteReview(id: string) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return { success: true as const };
  } catch (error) {
    console.error('Error deleting review:', error);
    return { success: false as const, error: 'Failed to delete the review.' };
  }
}
