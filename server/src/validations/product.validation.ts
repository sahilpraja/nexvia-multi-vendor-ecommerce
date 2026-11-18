import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    price: z.number().positive('Price must be greater than 0'),
    stock: z.number().int().nonnegative('Stock cannot be negative'),
    sku: z.string().min(2, 'SKU is required'),
    categoryId: z.string().uuid('Valid Category ID is required'),
    status: z.enum(['ACTIVE', 'DRAFT']).optional().default('DRAFT'),
    images: z.array(z.string().url('Image must be a valid URL')).max(5, 'Maximum 5 images allowed').optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().min(10).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().nonnegative().optional(),
    sku: z.string().min(2).optional(),
    categoryId: z.string().uuid().optional(),
    status: z.enum(['ACTIVE', 'DRAFT']).optional(),
    images: z.array(z.string().url()).max(5).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid Product ID'),
  }),
});

export const presignUploadSchema = z.object({
  body: z.object({
    fileName: z.string().min(1, 'File name is required'),
    fileType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
      errorMap: () => ({ message: 'Only JPG, PNG, and WebP images are supported' }),
    }),
    fileSize: z.number().max(5 * 1024 * 1024, 'File size cannot exceed 5MB'),
  }),
});
