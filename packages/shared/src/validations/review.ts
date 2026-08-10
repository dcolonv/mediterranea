import { z } from 'zod';

export const reviewSchema = z.object({
  appointmentId: z.string().min(1),
  rating: z.number().int().min(1, 'Please choose a rating').max(5),
  comment: z.string().max(1000).optional().default(''),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
