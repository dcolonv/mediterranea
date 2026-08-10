'use server';

import { randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { putObject, getSignedReadUrl, deleteObject } from '@/lib/storage/s3';
import type { PhotoType } from '@mediterranea/shared/types';

const COLLECTION = 'photos';
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export interface PhotoDTO {
  id: string;
  customerId: string;
  type: PhotoType;
  caption: string;
  url: string;
  createdAt: string | null;
}

function extForType(contentType: string): string {
  const sub = contentType.split('/')[1] || 'jpg';
  return sub.replace('jpeg', 'jpg');
}

/**
 * Core upload used by both the web action and the mobile API route. Stores the
 * bytes in Storage and writes a `photos` metadata doc. Returns the new photo id.
 */
export async function uploadPhotoBytes(input: {
  customerId: string;
  type: PhotoType;
  caption?: string;
  appointmentId?: string;
  bytes: Buffer;
  contentType: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!input.customerId) return { success: false, error: 'Missing client.' };
  if (input.type !== 'before' && input.type !== 'after') {
    return { success: false, error: 'Photo type must be before or after.' };
  }
  if (!input.contentType.startsWith('image/')) {
    return { success: false, error: 'Only image files are allowed.' };
  }
  if (input.bytes.length === 0) return { success: false, error: 'Empty file.' };
  if (input.bytes.length > MAX_BYTES) return { success: false, error: 'Image is too large (max 12 MB).' };

  try {
    const id = randomUUID();
    const storagePath = `clients/${input.customerId}/${id}.${extForType(input.contentType)}`;
    await putObject(storagePath, input.bytes, input.contentType);

    await getAdminDb().collection(COLLECTION).doc(id).set({
      customerId: input.customerId,
      type: input.type,
      caption: input.caption ?? '',
      ...(input.appointmentId && { appointmentId: input.appointmentId }),
      storagePath,
      createdAt: Timestamp.now(),
    });

    return { success: true, id };
  } catch (error) {
    console.error('Error uploading photo:', error);
    return { success: false, error: 'Failed to upload the photo.' };
  }
}

/** Web upload: accepts a File via FormData (from the backoffice UI). */
export async function uploadClientPhoto(formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) return { success: false as const, error: 'No file provided.' };
  const bytes = Buffer.from(await file.arrayBuffer());
  return uploadPhotoBytes({
    customerId: String(formData.get('customerId') ?? ''),
    type: String(formData.get('type') ?? '') as PhotoType,
    caption: String(formData.get('caption') ?? ''),
    appointmentId: (formData.get('appointmentId') as string) || undefined,
    bytes,
    contentType: file.type || 'image/jpeg',
  });
}

/** List a client's photos with short-lived signed download URLs. */
export async function listClientPhotos(
  customerId: string
): Promise<{ success: true; photos: PhotoDTO[] } | { success: false; error: string }> {
  try {
    const snap = await getAdminDb().collection(COLLECTION).where('customerId', '==', customerId).get();

    const photos = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        let url = '';
        try {
          url = await getSignedReadUrl(data.storagePath, SIGNED_URL_TTL_SECONDS);
        } catch (e) {
          console.error('Failed to sign URL for', data.storagePath, e);
        }
        const created = data.createdAt as { toDate?: () => Date } | undefined;
        return {
          id: d.id,
          customerId: data.customerId,
          type: data.type as PhotoType,
          caption: data.caption ?? '',
          url,
          createdAt: created?.toDate ? created.toDate().toISOString() : null,
        } satisfies PhotoDTO;
      })
    );

    // Newest first.
    photos.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return { success: true, photos };
  } catch (error) {
    console.error('Error listing photos:', error);
    return { success: false, error: 'Failed to load photos.' };
  }
}

export async function deleteClientPhoto(id: string) {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return { success: false as const, error: 'Photo not found.' };
    const path = doc.data()!.storagePath as string;

    await deleteObject(path).catch((e) => console.error('S3 delete failed (continuing):', e));
    await db.collection(COLLECTION).doc(id).delete();
    return { success: true as const };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return { success: false as const, error: 'Failed to delete the photo.' };
  }
}

/** All photo ids + paths for a customer — used by GDPR erasure to purge Storage. */
export async function purgeCustomerPhotos(customerId: string) {
  try {
    const snap = await getAdminDb().collection(COLLECTION).where('customerId', '==', customerId).get();
    await Promise.allSettled(
      snap.docs.map(async (d) => {
        await deleteObject(d.data().storagePath).catch(() => {});
        await d.ref.delete();
      })
    );
    return { success: true as const, deleted: snap.size };
  } catch (error) {
    console.error('Error purging customer photos:', error);
    return { success: false as const, error: 'Failed to purge photos.' };
  }
}
