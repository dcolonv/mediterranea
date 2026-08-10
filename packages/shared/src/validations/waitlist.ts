import { z } from 'zod';

export const waitlistSchema = z.object({
  serviceId: z.string().min(1, 'Please choose a treatment'),
  clientName: z.string().min(2, 'Name must be at least 2 characters'),
  clientEmail: z.string().email('Please enter a valid email'),
  clientPhone: z.string().min(6, 'Please enter a valid phone'),
  preferredDate: z.string().optional().default(''),
  staffId: z.string().optional().default(''),
  notes: z.string().max(500).optional().default(''),
});

export type WaitlistFormData = z.infer<typeof waitlistSchema>;
