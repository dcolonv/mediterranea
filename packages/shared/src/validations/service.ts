import { z } from 'zod';

export const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nameEs: z.string().optional().default(''),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens'),
  description: z.string().min(1, 'Description is required'),
  descriptionEs: z.string().optional().default(''),
  category: z.enum(['facial', 'treatment']),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
  price: z.number().min(0, 'Price must be zero or greater'),
  /** Room type this treatment requires; empty string = any active room. */
  roomType: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
