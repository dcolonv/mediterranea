import { z } from 'zod';

export const recipeSchema = z.object({
  steps: z
    .array(
      z.object({
        text: z.string().min(1),
        minutes: z.number().int().min(0).optional(),
      })
    )
    .default([]),
  products: z.array(z.string()).default([]),
  deviceSettings: z.string().optional().default(''),
  contraindications: z.string().optional().default(''),
  aftercare: z.string().optional().default(''),
});

export type RecipeFormData = z.infer<typeof recipeSchema>;
