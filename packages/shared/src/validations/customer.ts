import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(8, 'Please enter a valid phone number'),
  notes: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
