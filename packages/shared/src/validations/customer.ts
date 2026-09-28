import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  // Email and phone are optional (a walk-in may give only a name), but must be valid when given.
  email: z.string().email('Please enter a valid email address').or(z.literal('')),
  phone: z.string().min(8, 'Please enter a valid phone number').or(z.literal('')),
  notes: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
