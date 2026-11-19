import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Category name is required'),
    slug: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
    parentId: z.string().uuid().nullable().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    slug: z.string().optional(),
    description: z.string().optional().nullable(),
    imageUrl: z.string().url().optional().nullable().or(z.literal('')),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    parentId: z.string().uuid().nullable().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid Category ID'),
  }),
});
