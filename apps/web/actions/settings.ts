'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { studioSettingsSchema, type StudioSettingsFormData } from '@mediterranea/shared/validations';
import { DEFAULT_STUDIO_SETTINGS } from '@mediterranea/shared/constants';
import type { StudioSettings } from '@mediterranea/shared/types';

const DOC = 'settings/studio';

function docRef() {
  return getAdminDb().doc(DOC);
}

/** Read the studio settings, falling back to defaults when unset. */
export async function getSettings(): Promise<
  { success: true; data: StudioSettings } | { success: false; error: string }
> {
  try {
    const snap = await docRef().get();
    const data = snap.exists
      ? ({ ...DEFAULT_STUDIO_SETTINGS, ...snap.data() } as StudioSettings)
      : (DEFAULT_STUDIO_SETTINGS as unknown as StudioSettings);
    return { success: true, data };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { success: false, error: 'Failed to load settings.' };
  }
}

export async function updateSettings(data: StudioSettingsFormData) {
  const result = studioSettingsSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    await docRef().set(
      {
        ...result.data,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: 'Failed to save settings.' };
  }
}
