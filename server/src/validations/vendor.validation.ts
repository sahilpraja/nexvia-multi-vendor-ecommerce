import { z } from 'zod';

export const applyVendorSchema = z.object({
  body: z.object({
    storeName: z.string().min(2, 'Store name must be at least 2 characters'),
    description: z.string().optional(),
    payoutAccountId: z.string().optional(),
  }),
});

export const updateVendorProfileSchema = z.object({
  body: z.object({
    storeName: z.string().min(2).optional(),
    description: z.string().optional(),
    payoutAccountId: z.string().optional(),
  }),
});

export const updateVendorStatusSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'SUSPENDED']),
  }),
  params: z.object({
    id: z.string().uuid('Invalid vendor ID'),
  }),
});
