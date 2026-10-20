'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/firebase/serialize';
import { reviewSchema, type ReviewFormData } from '@mediterranea/shared/validations';
import type { Review, ReviewStatus } from '@mediterranea/shared/types';

const COLLECTION = 'reviews';

export interface PublicReview {
  id: string;
  authorName: string;
  serviceName: string;
  rating: number;
  comment: string;
  /** When it was written: the Google date if known, else when it was added. */
  date: string | null;
  source: 'google' | 'client';
}

/** Add a review copied from Google. It goes on the site straight away. */
export async function addReview(input: ReviewFormData) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Check the review.' };
  }
  try {
    const now = Timestamp.now();
    const ref = await getAdminDb()
      .collection(COLLECTION)
      .add({
        ...parsed.data,
        source: 'google',
        status: 'published' as ReviewStatus,
        createdAt: now,
        updatedAt: now,
      });
    return { success: true as const, id: ref.id };
  } catch (error) {
    console.error('Error adding review:', error);
    return { success: false as const, error: 'Failed to add the review.' };
  }
}

/** Published reviews for public display, newest first. */
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
          date: r.reviewDate || (created?.toDate ? created.toDate().toISOString().slice(0, 10) : null),
          source: r.source === 'google' ? 'google' : 'client',
        } satisfies PublicReview;
      })
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
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
