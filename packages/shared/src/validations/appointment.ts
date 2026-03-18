import { z } from 'zod';

export const appointmentSchema = z.object({
  serviceId: z.string().min(1, 'Please select a service'),
  serviceName: z.string().min(1),
  clientName: z.string().min(2, 'Name must be at least 2 characters'),
  clientEmail: z.string().email('Please enter a valid email address'),
  clientPhone: z.string().min(8, 'Please enter a valid phone number'),
  appointmentDate: z.string().min(1, 'Please select a date'),
  appointmentTime: z.string().min(1, 'Please select a time'),
  durationMinutes: z.number().min(1),
  notes: z.string().optional().default(''),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
