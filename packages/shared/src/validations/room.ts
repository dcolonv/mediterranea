import { z } from 'zod';

export const roomSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  /** Free-form room type, matched against Service.roomType. */
  type: z.string().min(1, 'Type is required'),
  isActive: z.boolean().optional().default(true),
});

export type RoomFormData = z.infer<typeof roomSchema>;
