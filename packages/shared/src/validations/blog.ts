import { z } from 'zod';

export const blogPostSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens'),
  excerpt: z.string().max(300).optional().default(''),
  body: z.string().min(1, 'Body is required'),
  coverImageUrl: z.string().url().optional().or(z.literal('')).default(''),
  seoTitle: z.string().max(120).optional().default(''),
  seoDescription: z.string().max(300).optional().default(''),
  status: z.enum(['draft', 'published']).default('draft'),
});

export type BlogPostFormData = z.infer<typeof blogPostSchema>;
