import { z } from 'zod';

const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
});

export const studioSettingsSchema = z.object({
  businessHours: z.record(z.string(), dayHoursSchema.nullable()),
  booking: z.object({
    minLeadHours: z.number().int().min(0).max(720),
    maxAdvanceDays: z.number().int().min(1).max(365),
    slotIntervalMinutes: z.number().int().min(5).max(120),
  }),
  cancellation: z.object({
    cutoffHours: z.number().int().min(0).max(720),
    policyText: z.string().max(1000),
  }),
});

export type StudioSettingsFormData = z.infer<typeof studioSettingsSchema>;
