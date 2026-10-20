import { z } from 'zod';

/** A review copied in from Google by staff. */
export const reviewSchema = z.object({
  authorName: z.string().trim().min(1, 'Add the reviewer’s name').max(80),
  rating: z.number().int().min(1, 'Choose a rating').max(5),
  comment: z.string().trim().max(2000).optional().default(''),
  serviceName: z.string().trim().max(120).optional().default(''),
  /** When it was written on Google (YYYY-MM-DD); empty if unknown. */
  reviewDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(''))
    .optional()
    .default(''),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
