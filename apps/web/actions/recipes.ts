'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { recipeSchema, type RecipeFormData } from '@mediterranea/shared/validations';
import type { Recipe } from '@mediterranea/shared/types';

const COLLECTION = 'recipes';

export interface RecipeDTO {
  serviceId: string;
  steps: { text: string; minutes?: number }[];
  products: string[];
  deviceSettings: string;
  contraindications: string;
  aftercare: string;
}

function toDTO(serviceId: string, r?: Partial<Recipe>): RecipeDTO {
  return {
    serviceId,
    steps: (r?.steps ?? []).map((s) => ({ text: s.text, ...(s.minutes != null && { minutes: s.minutes }) })),
    products: r?.products ?? [],
    deviceSettings: r?.deviceSettings ?? '',
    contraindications: r?.contraindications ?? '',
    aftercare: r?.aftercare ?? '',
  };
}

export async function getRecipe(serviceId: string): Promise<RecipeDTO> {
  const doc = await getAdminDb().collection(COLLECTION).doc(serviceId).get();
  return toDTO(serviceId, doc.exists ? (doc.data() as Recipe) : undefined);
}

export async function saveRecipe(serviceId: string, data: RecipeFormData) {
  const parsed = recipeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: 'Please check the recipe fields.' };
  }
  try {
    await getAdminDb()
      .collection(COLLECTION)
      .doc(serviceId)
      .set(
        {
          serviceId,
          steps: parsed.data.steps,
          products: parsed.data.products,
          deviceSettings: parsed.data.deviceSettings,
          contraindications: parsed.data.contraindications,
          aftercare: parsed.data.aftercare,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    return { success: true as const };
  } catch (error) {
    console.error('Error saving recipe:', error);
    return { success: false as const, error: 'Failed to save the recipe.' };
  }
}
