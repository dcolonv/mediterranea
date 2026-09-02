import { z } from 'zod';

const timePattern = /^\d{2}:\d{2}$/;

export const dayHoursSchema = z.object({
  open: z.string().regex(timePattern, 'Use HH:MM'),
  close: z.string().regex(timePattern, 'Use HH:MM'),
});

export const timeOffSchema = z.object({
  date: z.string().min(1),
  endDate: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  reason: z.string().optional(),
});

export const staffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.string().min(1, 'Role is required'),
  active: z.boolean().optional().default(true),
  /** Service ids this staff member is qualified to perform. */
  serviceIds: z.array(z.string()).optional().default([]),
  /** Weekday → hours, or null for a non-working day. */
  workingHours: z.record(z.string(), dayHoursSchema.nullable()).optional().default({}),
  timeOff: z.array(timeOffSchema).optional().default([]),
});

export type StaffFormData = z.infer<typeof staffSchema>;
