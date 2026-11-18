import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Category name is required'),
    slug: z.string().optional(),
    parentId: z.string().uuid().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    slug: z.string().optional(),
    parentId: z.string().uuid().nullable().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid Category ID'),
  }),
});
